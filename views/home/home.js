import MQTT from "../../app/mqtt/mqtt";
import viewChange from "~/mixins/viewChange";
import appLogs from "../../app/utils/logs";
import logTags from "../../app/utils/log_tags";
import ButtonTransaction from "../../app/utils/button_trans/button_transaction";
import messages from "~/app/utils/messages/messages";
import Utils from "../../app/utils/utils";
import uniqid from 'uniqid';
import PingInternet from "../../app/utils/pingInternet";
import AES from "crypto-js/aes";
import _ from "lodash";
import moment from "moment-timezone";
import { webApp, applianceTypeId, version, buildVersion, passSecretKey } from "../../static/app_config";
import locPermComp from "../../components/loc_perm";
import EncLocalStorage from "../../app/utils/enc_local_storage";
// ======================
export default {
    name: "HomeView",
    components: {
        "location-permission": locPermComp,
    },
    data() {
        return {
            provisionDialog: false,
            isWebApp: false,
            name: "",
            btnClickedTransIdColl: [],
            timeout: 5000,
            top: true,
            right: true,
            snackbar: false,
            color: "",
            msg: "",
            applSearch: "",
            wifiInfo: "",
            applTHeaders: [{
                text: "",
                value: "expand",
                align: "left",
                sortable: false,
                class: "px-0 text-left"
            },
            {
                text: "Appliance",
                value: "name",
                align: "left",
                sortable: false,
                class: "px-1 text-left"
            },
            {
                value: "applianceNickName",
            },
            {
                text: "",
                icon: "cloud_queue",
                value: "applianceStatus",
                align: "center",
                sortable: false,
                class: "px-1 text-center"
            },
            {
                text: "",
                value: "button",
                align: "center",
                sortable: false,
                class: "px-1 text-center"
            }
            ],
            removeApplDialogOne: false,
            removeApplDialog: false,
            applItems: [],
            tableMsg: "",
            turnStatus: "",
            //-----------------s
            chosenApplIndex: 0,
            selectedId: "",
            //    ==========
            confirmExitDialog: false,
            showLoading: false,
            showList: false,
            // --------
            releaseBuzzerTimeout: {},
            //------------
            activated: false,
            ApiError: false,
            showInternetLost: false,
            showTooltip: false,
            expandStyleObject: {},
            showAlertFBBut: false,
            removeApplianceloader: false,
            removeApplianceName: "",
            removeApplianceId: "",
            //-----------
            notificationsList: [],
            filteredNotificationsList: [],
            notiLenght: 0,
            applianceList: [],
            // ---------------------------------------
            cPassValid: true,
            showCPass: true,
            confirmPasswordRules: [
                (v) => !!v || messages.rules.confirmPassword
            ],
            confirmPassword: ""
        };
    },
    middleware: ["auth"],
    mixins: [viewChange],
    created() {
        localStorage.setItem("build_version", buildVersion);
        this.isWebApp = webApp;
    },
    filters: {
        formatDate(date) {
            return moment(date).format('MMMM Do YYYY');
        }
    },
    beforeRouteEnter(to, from, next) {
        if (!webApp) {
            if (from.name === "index") {
                EncLocalStorage.setItem("SendDeviceInfo", "true");
            }
        }
        next();
    },
    beforeDestroy() {
        EncLocalStorage.removeItem("SendDeviceInfo");
        this.$root.$off("REFRESH_NOTIFICATION");
        this.$root.$off("TRIGGER_NOTI_LIST");
    },
    mounted() {
        this.$store.commit('wifiSetupData/wifiSetupState', false);
        this.mountedFunctions();
        this.$store.commit("setAppState", true);
        appLogs.recordLog(
            logTags.home,
            {
                "view_arrived": "Home"
            }
        );
        this.$root.$on("REFRESH_NOTIFICATION", () => {
            this.getNotificationsList();
        });
        this.$root.$on("INITIATE_NOTI_LIST", () => {
            this.applianceList = this.$store.state.applianceList.applianceList.userApplianceList;
            this.getNotificationsList();
        });
        this.$root.$on("TRIGGER_NOTI_LIST", () => {
            this.applianceList = this.$store.state.applianceList.applianceList.userApplianceList;
            this.getNotificationsList();
        });
    },
    methods: {
        // ===============
        // ===============
        sendDeviceInfo() {
            if (EncLocalStorage.getItem("SendDeviceInfo") === "true") {
                let deviceInfo = _.omit(window.device, ['available', 'isVirtual']);
                deviceInfo.appVersion = version;
                deviceInfo.buildVersion = buildVersion;
                deviceInfo["userAgent"] = navigator.userAgent;
                window.setTimeout(function () {
                    let deviceInfo = this.$config.get("deviceInfo");
                    deviceInfo.data.deviceInfo = deviceInfo;
                    this.$responseManager.execute(deviceInfo);
                }, 2000);
                this.storeDataForException();
            }
        },
        storeDataForException() {
            this.$store.state.exceptionStore.exceptionObj.version = version;
            this.$store.state.exceptionStore.exceptionObj.buildVersion = buildVersion;
            let userName = this.$store.state.loginStore.userInfo.userName;
            if (typeof userName !== "undefined") this.$store.state.exceptionStore.exceptionObj.userName = userName;
            if (typeof window.device !== "undefined") {
                let deviceInfoForException = _.omit(window.device, ['available', 'isVirtual', 'cordova', 'serial', 'uuid']);
                this.$store.state.exceptionStore.exceptionObj.deviceInfo = deviceInfoForException;
            }
            else {
                this.$store.state.exceptionStore.exceptionObj.deviceInfo = "web";
            }
        },
        mountedFunctions() {
            this.setTableMsg();
            this.getApplianceList();
            // this.renderApplianceList();
            MQTT.connect();
        },

        isOwner(applianceOwner) {
            return EncLocalStorage.getItem("userId") === applianceOwner;
        },
        //-------------------------------------
        refresh() {
            this.$root.$emit("REFRESH_NOTIFICATION");
            this.getApplianceList();
        },
        //-------------------------------------
        setTableMsg() {
            this.tableMsg = messages.loaders.appList;
        },
        getApplianceList() {
            if (!webApp) {
                this.setCookie();
            } else {
                this.apiCallForApplianceList();
            }
        },
        setCookie() {
            cookieMaster.setCookieValue('https://client.klario.net', 'klario', EncLocalStorage.getItem("klarioCookie"),
                () => {
                    console.log('klario cookie has been set');
                    cookieMaster.setCookieValue('https://client.klario.net', 'klario.sig', EncLocalStorage.getItem("klarioSigCookie"),
                        () => {
                            console.log('klario.sig cookie has been set');
                            this.apiCallForApplianceList();
                        },
                        (error) => {
                            console.log('Error setting klario.sig cookie: ' + error);
                            this.apiCallForApplianceList();
                        }
                    );
                },
                (error) => {
                    console.log('Error setting klario cookie: ' + error);
                    this.apiCallForApplianceList();
                }
            );
            this.sendDeviceInfo();
        },
        apiCallForApplianceList() {
            this.showLoading = true;
            let applCustomList = this.$config.get("appliance_custom_list");
            applCustomList.data.applianceTypeId = applianceTypeId;
            applCustomList.successCallback = this.renderApplianceList.bind(this);
            applCustomList.errorCallback = this.errorApplianceList.bind(this);
            this.$responseManager.execute(applCustomList);
            appLogs.recordLog(
                logTags.home,
                {
                    "action": "Get appliance list"
                }
            );
        },
        errorApplianceList() {
            this.tableMsg = messages.errors.applList;
            this.showLoading = false;
            this.ApiError = true;
            appLogs.recordLog(
                logTags.home,
                {
                    "get_appl_list": "ERROR"
                }
            );
        },
        renderApplianceList(res) {
            console.log(res);
            let applianceFullList = this.$store.state.applianceList.applianceList.userApplianceList;
            let applList = [];
            let logApplList = [];

            let applianceData = {};
            let hostName = "", applName = "", nickName = "", displayName = "";
            let isNickName = false;

            for (let i = 0; i < applianceFullList.length; i++) {
                let applPermission = this.$getAppliancePermissionInfo(applianceFullList[i].applianceId);
                if (!applPermission.isLifeTimeAccess) {
                    if (applPermission.applianceAccessStartTime && applPermission.applianceAccessEndTime) {
                        if (moment().isBefore(moment(applPermission.applianceAccessEndTime))) {
                            applList.push(applianceFullList[i]);
                        }
                    }
                    else {
                        if (moment.utc(new Date()).isBefore(moment.utc(new Date(applPermission.accessEndTimeStamp)))) {
                            applList.push(applianceFullList[i]);
                        }
                    }
                } else {
                    applList.push(applianceFullList[i]);
                }
            }
            // -------------------
            if (!applList.length) {
                this.tableMsg = messages.tableInfo.newUser;
                this.showLoading = false;
            }
            // -------------------
            this.applItems.splice(0, this.applItems.length);
            // -------------------

            for (let i = 0; i < applList.length; i++) {
                //-----------------
                isNickName = false;
                hostName = applList[i].applianceHostName;
                applName = applList[i].applianceName;
                nickName = applList[i].userSettings.applianceNickName;
                if (nickName.length > 0) {
                    displayName = nickName;
                    isNickName = true;
                } else if (applName.length > 0) {
                    displayName = applName;
                } else {
                    displayName = hostName;
                }
                //-----------------
                applianceData = {
                    itemIndex: i,
                    isConnected: applList[i].isConnected,
                    applLoader: false,
                    gettingGPS: false,
                    applianceId: applList[i].applianceId,
                    isProvisioned: applList[i].isProvisioned,
                    expand: "",
                    expandValue: false,
                    name: applList[i].applianceName,
                    applianceCoordinate: applList[i].applianceCoordinate,
                    hostName: applList[i].applianceHostName,
                    location: applList[i].applianceLocation,
                    locationName: applList[i].applianceLocationName,
                    applianceStatus: applList[i].applianceStatus === "on",
                    applianceOwner: applList[i].applianceOwner,
                    applNameTagId: applList[i].applianceId + "applianceName",
                    applStatusTagId: applList[i].applianceId + "statusMsg",
                    activated: false,
                    buttonError: false,
                    buttonErrorIcon: "warning",
                    activationTimer: "",
                    activateTime: (parseInt(applList[i].userSettings.activateTime) > 0) ? applList[i].userSettings.activateTime : "",
                    applianceNickName: (applList[i].userSettings.applianceNickName.length > 0) ? applList[i].userSettings.applianceNickName : "",
                    alertCoords: applList[i].userSettings.applianceAlertCoordinates,
                    popupIcon: applList[i].userSettings.popupIcon,
                    isPopup: applList[i].userSettings.isPopup,
                    applianceAccessStartTime: this.getAccessStartTime(applList[i]),
                    isBeforeStartTime: this.checkForBeforeStartTime(applList[i]),
                    lastDisconnectionAt: applList[i].lastDisconnectionAt,
                    defaultGeoFencingRadius: applList[i].defaultGeoFencingRadius,
                    defaultTimeRestriction: applList[i].defaultTimeRestriction,
                    displayName: displayName,
                    isNickName: isNickName,
                    isNewApplStatus: !applList[i].isProvisioned && this.$userRoleAccess(applList[i].applianceId, 'permitApplianceWifiConfigure')
                };
                if (typeof applList[i].userSettings.isGeofencing !== "undefined") {
                    applianceData.isGeofencing = applList[i].userSettings.isGeofencing;
                    applianceData.geofenceRadius = applList[i].userSettings.geofenceRadius;
                    applianceData.isTimeRestriction = applList[i].userSettings.isTimeRestriction;
                    applianceData.timeRestrictionData = applList[i].userSettings.timeRestriction;
                } else {
                    applianceData.isGeofencing = false;
                    applianceData.isTimeRestriction = false;
                }
                this.applItems.push(applianceData);

                logApplList.push({
                    applianceId: applList[i].applianceId,
                    isProvisioned: applList[i].isProvisioned,
                    name: applList[i].applianceName,
                    applianceCoordinate: applList[i].applianceCoordinate,
                    location: applList[i].applianceLocation,
                    locationName: applList[i].applianceLocationName,
                    applianceOwner: applList[i].applianceOwner,
                    applianceNickName: applList[i].userSettings.applianceNickName,
                    alertCoords: applList[i].userSettings.applianceAlertCoordinates,
                    popupIcon: applList[i].userSettings.popupIcon,
                    isPopup: applList[i].userSettings.isPopup,
                    activateTime: (parseInt(applList[i].userSettings.activateTime) > 0) ? applList[i].userSettings.activateTime : "",
                    isConnected: applList[i].isConnected,
                    applianceAccessStartTime: this.getAccessStartTime(applList[i]),
                    isBeforeStartTime: this.checkForBeforeStartTime(applList[i]),
                    isGeofencing: applianceData.isGeofencing,
                    isTimeRestriction: applianceData.isTimeRestriction
                });
            }

            if (this.applItems.length) {
                this.showList = true;
            } else {
                this.showList = false;
                this.$refs.toolBarComponent.menuItems[3].show = false;
                this.$refs.toolBarComponent.menuItems[4].show = false;
            }
            // console.log(this.applItems);
            // this.applItems[0].isNewApplStatus = false;
            // console.log(this.applItems);
            this.$forceUpdate();
            // ----------------
            MQTT.subscribeForEachAppliance(applList);
            // ----------------
            appLogs.recordLog(
                logTags.home,
                {
                    "get_appl_list": "SUCCESS",
                    "render_appl_list": "COMPLETE",
                    "appliance_list": logApplList
                }
            );
            this.$root.$emit("INITIATE_NOTI_LIST");
            this.$root.$off("INITIATE_NOTI_LIST");
        },
        //-------------------------------------
        //-------------------------------------
        //====================================================================
        //====================================================================
        isMobile() {
            return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
        },
        goToWifiConfig(applianceId, applianceNickName, activateTime, isProv) {
            if (!isProv && !this.isMobile()) {
                this.provisionDialog = true;
                this.storeSelectedDeviceData(applianceId, applianceNickName, activateTime);
                this.$router.push("/wifiSetupAppl");
            }
        },
        //-------------------------------------
        goToDeviceSettings(applianceId, applianceNickName, activateTime, applianceAlertCoordinates) {
            this.storeSelectedDeviceData(applianceId, applianceNickName, activateTime, applianceAlertCoordinates);
            this.$root.$router.push("/applianceSettings");
        },
        goToInviteUser(applianceId, applianceNickName) {
            this.storeSelectedDeviceData(applianceId, applianceNickName);
            this.$root.$router.push("/bulkInvite");
        },
        goToUsers(applianceId, applianceNickName) {
            this.storeSelectedDeviceData(applianceId, applianceNickName);
            this.$root.$router.push("/userAccessType");
        },
        goToInfo(applianceId, applianceNickName) {
            this.storeSelectedDeviceData(applianceId, applianceNickName);
            this.$root.$router.push("/info");
        },
        //-------------------------------------
        //-------------------------------------
        storeSelectedDeviceData(applianceId, applianceNickName, activateTime, applianceAlertCoordinates) {
            let applList = this.$store.state.applianceList.applianceList.userApplianceList;
            let applData = _.find(applList, { "applianceId": applianceId });
            applData.applianceNickName = (typeof applianceNickName !== "undefined") ? applianceNickName : "";
            applData.activateTime = (typeof activateTime !== "undefined") ? activateTime : "";
            applData.applianceAlertCoordinates = "";
            applData.applianceAlertCoordinates = (typeof applianceAlertCoordinates !== "undefined") ? applianceAlertCoordinates : "";
            this.$store.commit(
                'chosenAppliance/storeSelectedApplData',
                applData
            );
        },
        //-------------------------------------
        //-------------------------------------
        checkForBeforeStartTime(applianceInfo) {
            let applPermission = this.$getAppliancePermissionInfo(applianceInfo.applianceId);
            if (!applPermission.isLifeTimeAccess) {
                if (moment().isBefore(moment(applPermission.applianceAccessStartTime))) {
                    return true;
                }
                else return false;
            } else return false;
        },
        getAccessStartTime(applianceInfo) {
            let applPermission = this.$getAppliancePermissionInfo(applianceInfo.applianceId);
            return applPermission.applianceAccessStartTime;
        },
        expandRow(props) {
            props.item.expandValue = true;
            props.expanded = props.item.isBeforeStartTime;
            return true;
        },
        expandSlotRow(props) {
            let domElements = document.getElementsByClassName("homeTableBorderTop");
            for (let i = 0; i < domElements.length; i++) {
                domElements[i].classList.remove("homeTableBorderTop");
            }
            if (!props.expanded && props.item.isProvisioned) {
                document.getElementById(props.item.itemIndex).classList.add("homeTableBorderTop");
            }
            else {
                document.getElementById(props.item.itemIndex).classList.remove("homeTableBorderTop");
            }
            return props.expanded = (!props.expanded && props.item.isProvisioned);
        },
        setTimer() {
            let that = this;
            that.showTooltip = true;
            window.setTimeout((function () {
                that.showTooltip = false;
            }).bind(this), 3000);
        },
        //-------------------------------------
        checkInternet(itemIndex, status, activateTime) {
            if (webApp) {
                ButtonTransaction.recordButtonPress(this.applItems[itemIndex].applianceId);   // Comment/disable this line for mobile app
            }
            let that = this;
            let bindObj = {
                pItemIndex: itemIndex,
                pStatus: status,
                pActivateTime: activateTime,
                pApplId: this.applItems[itemIndex].applianceId
            };
            let internetConnected = function (res) {
                that.applStatusChanged(this.pItemIndex, this.pStatus, this.pActivateTime);
            };
            let internetDisconnected = function (res) {
                that.releaseBuzzButton(this.pItemIndex);
                that.showNotification(messages.internet.internetLost);
                ButtonTransaction.recordNoInternetAfterPress("_internet_check", this.pApplId);
            };
            PingInternet.checkConnection(
                internetConnected.bind(bindObj),
                internetDisconnected.bind(bindObj));
        },
        //-------------------------------------
        applStatusChanged(itemIndex, status, activateTime) {
            this.chosenApplIndex = itemIndex;
            this.chosenApplStatus = status;
            let applianceId = this.applItems[itemIndex].applianceId;
            this.id = applianceId;
            //-----------------
            let activateAppl = _.cloneDeep(this.$config.get("activate_appliance"));
            activateAppl.options.headers["x-transaction-id"] = uniqid();
            activateAppl.options.headers["x-transaction-init-timestamp"] = ButtonTransaction.buttonPressTime[applianceId].utc().format("x");
            activateAppl.data.applianceId = applianceId;
            activateAppl.data.activateTime = activateTime;
            activateAppl.successCallback = this.statusChangeSuccess.bind(this);
            activateAppl.errorCallback = this.statusChangeError.bind(this);
            this.$responseManager.execute(activateAppl);

            appLogs.recordLog(
                logTags.buzzer,
                {
                    "action": "Click",
                    "status": "API CALL",
                    "text": "Buzzer button",
                    "data": {}
                }
            );

        },
        statusChangeSuccess(response) {
            let responseObj = response.responseData.response;
            let applId = responseObj.applianceId;
            let transactionId = responseObj.transactionId;
            this.btnClickedTransIdColl.push(responseObj.transactionId);
            let applianceData = _.find(this.applItems, {
                applianceId: applId
            });
            let index = applianceData.itemIndex;

            this.showActivationTimer(index, applianceData.activateTime);
            let timeOutForTransactionInfo = applianceData.activateTime + 3000;
            this.releaseBuzzerTimeout[applId] = window.setTimeout(
                (function () {
                    this.checkActivateStatus(transactionId);
                }).bind(this),
                timeOutForTransactionInfo
            );

            if (this.chosenApplStatus) this.applItems[index].value = false;
            else this.applItems[index].value = true;

            // ************
            ButtonTransaction.recordButtonApiResponse(response, applId);
            // ************

            appLogs.recordLog(
                logTags.buzzer,
                {
                    "action": "Click",
                    "status": "SUCCESS",
                    "text": "Buzzer button",
                    "data": responseObj
                }
            );
        },
        activateBuzzer(index, value, activateTime) {
            ButtonTransaction.recordButtonPress(this.applItems[index].applianceId);
            this.enableBuzzButton(index);
            this.checkInternet(index, value, activateTime);
        },
        //--------------------
        enableBuzzButton(index) {
            this.applItems[index].applLoader = true;
        },
        releaseBuzzButton(index) {
            this.applItems[index].applLoader = false;
        },
        releaseAllBuzzButton() {
            for (let i = 0; i < this.applItems.length; i++) {
                this.applItems[i].applLoader = false;
            }
        },
        //-------------------------
        showActivationTimer(index, activateTime) {
            let actTime = activateTime;
            let intervalTimeOut;
            intervalTimeOut = activateTime + 250;
            let timerInterval = window.setInterval((function () {
                this.applItems[index].activationTimer = parseInt(actTime / 1000) + "";
                actTime = actTime - 1000;
            }).bind(this), 1000);

            window.setTimeout((function () {
                this.applItems[index].activationTimer = "";
                window.clearInterval(timerInterval);
            }).bind(this), intervalTimeOut);
        },
        //-------------------------
        statusChangeError(res) {
            // let errorResponse = this.$store.state.activateAppliance.activateErrorResponse;
            if (
                typeof res.responseData !== "undefined"
                &&
                typeof res.responseData.response !== "undefined"
                &&
                typeof res.responseData.response.applianceId !== "undefined"
            ) {
                let errorResponse = res.responseData.response;
                let applianceData = _.find(this.applItems, { applianceId: errorResponse.applianceId });
                let index = applianceData.itemIndex;

                this.releaseBuzzButton(index);
                if (applianceData.applianceNickName !== "") {
                    errorResponse.message = errorResponse.message.replace(applianceData.name, applianceData.applianceNickName);
                }
                this.showNotification(errorResponse.message);
                this.getApplianceList();
                ButtonTransaction.recordApiCallError(res, "activate", res.responseData.response.transactionId, errorResponse.applianceId);
            }
            else {
                this.apiTimedOut(res, "activate");
            }
            appLogs.recordLog(
                logTags.buzzer,
                {
                    "action": "Click",
                    "status": "ERROR",
                    "text": "Buzzer button",
                    "data": res
                }
            );
        },
        onSocketStatusChange(message, topic) {
            if (message.length < 1) {
                return false;
            }
            this.$root.$emit("TRIGGER_NOTI_LIST");
            let response = JSON.parse(message).notificationBody;
            console.log(response);
            // -----------------------------------------
            let transIdCollIndex = this.btnClickedTransIdColl.indexOf(response.transactionId);
            if (transIdCollIndex < 0) {
                return false;
            } else {
                this.btnClickedTransIdColl.splice(transIdCollIndex, 1);
            }
            // -----------------------------------------
            let applianceData = _.find(this.applItems, {
                applianceId: response.applianceId
            });
            if (applianceData) {
                let applianceData = _.find(this.applItems, {
                    applianceId: response.applianceId
                });
                console.log(applianceData, "applianceData");
                //-----------------
                this.snackbar = false;
                let activationStatusMsg = response.transactionResponse.notiMessage;
                let eventStatusName = response.transactionResponse.eventName;
                //-----------------
                if (applianceData.applianceNickName !== "") {
                    activationStatusMsg = activationStatusMsg.replace(applianceData.name, applianceData.applianceNickName);
                }
                this.releaseBuzzButton(applianceData.itemIndex);
                this.showApplianceResponse(applianceData.itemIndex, eventStatusName, activationStatusMsg);
                //-----------------
                window.clearTimeout(this.releaseBuzzerTimeout[response.applianceId]);
                ButtonTransaction.recordMQTTResponse(response);
                // ************
                // ************
                appLogs.recordLog(
                    logTags.buzzer,
                    {
                        "action": "Socket",
                        "status": "RESPONSE",
                        "text": "Activation response",
                        "data": response
                    }
                );
            }
        },
        onSocketApplianceConnectionStatusChange(message, topic) {
            if (message.length < 1) {
                return false;
            }
            this.$root.$emit("TRIGGER_NOTI_LIST");
            let response = JSON.parse(message).notificationBody;
            let applianceData = _.find(this.applItems, {
                applianceId: response.applianceId
            });
            if (applianceData) {
                console.log(applianceData, "applianceData");
                //-----------------
                this.snackbar = false;
                if (applianceData.applianceNickName !== "") {
                    response.message = response.message.replace(applianceData.name, applianceData.applianceNickName);
                }
                this.applItems[applianceData.itemIndex].lastDisconnectionAt = response.lastDisconnectionAt;
                this.applItems[applianceData.itemIndex].isConnected = response.connectionStatus;
                this.showDisconnectStatusResponse(applianceData.itemIndex, response.message);
                appLogs.recordLog(
                    logTags.buzzer,
                    {
                        "action": "Socket",
                        "status": "RESPONSE",
                        "text": "Appliance Connect/Disconnect response",
                        "data": response
                    }
                );
            }
        },
        onSocketAppRefresh(socketMsg) {
            if (socketMsg.length > 10) {
                this.getApplListUpdate();
            }
        },
        // ****************************
        getApplListUpdate() {
            let successCallBack = function (res) {
                let responseApplList = [];
                let respObj = res.responseData.response;
                let applianceFullList = respObj.userApplianceList;
                for (let i = 0; i < applianceFullList.length; i++) {
                    let applPermission = this.$getAppliancePermissionInfo(applianceFullList[i].applianceId);
                    if (!applPermission.isLifeTimeAccess) {
                        if (applPermission.applianceAccessStartTime && applPermission.applianceAccessEndTime) {
                            if (moment().isBefore(moment(applPermission.applianceAccessEndTime))) {
                                responseApplList.push(applianceFullList[i]);
                            }
                        }
                        else {
                            if (moment.utc(new Date()).isBefore(moment.utc(new Date(applPermission.accessEndTimeStamp)))) {
                                responseApplList.push(applianceFullList[i]);
                            }
                        }
                    } else {
                        responseApplList.push(applianceFullList[i]);
                    }
                }

                this.updateApplList(responseApplList);
            };

            let applCustomList = this.$config.get("appliance_custom_list");
            applCustomList.data.applianceTypeId = applianceTypeId;
            applCustomList.successCallback = successCallBack.bind(this);
            applCustomList.errorCallback = function () { };
            this.$responseManager.execute(applCustomList);
            appLogs.recordLog(
                logTags.home,
                {
                    "action": "check for appliance list update on socket update"
                }
            );
        },
        updateApplList(applList) {
            let applianceData = {};
            let hostName = "", applName = "", nickName = "", displayName = "";
            let isNickName = false;
            let logApplList = [];

            if (!applList.length) {
                this.tableMsg = messages.tableInfo.newUser;
                this.showLoading = false;
            }
            // -------------------
            this.applItems.splice(0, this.applItems.length);
            // -------------------

            for (let i = 0; i < applList.length; i++) {
                //-----------------
                //-----------------
                isNickName = false;
                hostName = applList[i].applianceHostName;
                applName = applList[i].applianceName;
                nickName = applList[i].userSettings.applianceNickName;
                if (nickName.length > 0) {
                    displayName = nickName;
                    isNickName = true;
                } else if (applName.length > 0) {
                    displayName = applName;
                } else {
                    displayName = hostName;
                }
                // ----------------
                applianceData = {
                    itemIndex: i,
                    isConnected: applList[i].isConnected,
                    applLoader: false,
                    gettingGPS: false,
                    applianceId: applList[i].applianceId,
                    isProvisioned: applList[i].isProvisioned,
                    expand: "",
                    expandValue: false,
                    name: applList[i].applianceName,
                    applianceCoordinate: applList[i].applianceCoordinate,
                    hostName: applList[i].applianceHostName,
                    location: applList[i].applianceLocation,
                    locationName: applList[i].applianceLocationName,
                    applianceStatus: applList[i].applianceStatus === "on",
                    applianceOwner: applList[i].applianceOwner,
                    applNameTagId: applList[i].applianceId + "applianceName",
                    applStatusTagId: applList[i].applianceId + "statusMsg",
                    activated: false,
                    buttonError: false,
                    buttonErrorIcon: "warning",
                    activationTimer: "",
                    activateTime: (parseInt(applList[i].userSettings.activateTime) > 0) ? applList[i].userSettings.activateTime : "",
                    applianceNickName: (applList[i].userSettings.applianceNickName.length > 0) ? applList[i].userSettings.applianceNickName : "",
                    alertCoords: applList[i].userSettings.applianceAlertCoordinates,
                    popupIcon: applList[i].userSettings.popupIcon,
                    isPopup: applList[i].userSettings.isPopup,
                    applianceAccessStartTime: this.getAccessStartTime(applList[i]),
                    isBeforeStartTime: this.checkForBeforeStartTime(applList[i]),
                    lastDisconnectionAt: applList[i].lastDisconnectionAt,
                    displayName: displayName,
                    isNickName: isNickName,
                    isNewApplStatus: !applList[i].isProvisioned && this.$userRoleAccess(applList[i].applianceId, 'permitApplianceWifiConfigure')
                };

                if (typeof applList[i].userSettings.isGeofencing !== "undefined") {
                    applianceData.isGeofencing = applList[i].userSettings.isGeofencing;
                    applianceData.geofenceRadius = applList[i].userSettings.geofenceRadius;
                    applianceData.isTimeRestriction = applList[i].userSettings.isTimeRestriction;
                    applianceData.timeRestrictionData = applList[i].userSettings.timeRestriction;
                } else {
                    applianceData.isGeofencing = false;
                    applianceData.isTimeRestriction = false;
                }
                this.applItems.push(applianceData);
                // --------------------------------------------------------------------
                logApplList.push({
                    applianceId: applList[i].applianceId,
                    isProvisioned: applList[i].isProvisioned,
                    name: applList[i].applianceName,
                    applianceCoordinate: applList[i].applianceCoordinate,
                    location: applList[i].applianceLocation,
                    locationName: applList[i].applianceLocationName,
                    applianceOwner: applList[i].applianceOwner,
                    applianceNickName: applList[i].userSettings.applianceNickName,
                    alertCoords: applList[i].userSettings.applianceAlertCoordinates,
                    popupIcon: applList[i].userSettings.popupIcon,
                    isPopup: applList[i].userSettings.isPopup,
                    activateTime: (parseInt(applList[i].userSettings.activateTime) > 0) ? applList[i].userSettings.activateTime : "",
                    isConnected: applList[i].isConnected,
                    applianceAccessStartTime: this.getAccessStartTime(applList[i]),
                    isBeforeStartTime: this.checkForBeforeStartTime(applList[i]),
                    isGeofencing: applianceData.isGeofencing,
                    isTimeRestriction: applianceData.isTimeRestriction
                });
            }

            if (this.applItems.length) {
                this.showList = true;
            } else {
                this.showList = false;
                this.$refs.toolBarComponent.menuItems[3].show = false;
                this.$refs.toolBarComponent.menuItems[4].show = false;
            }
            this.$forceUpdate();
            // ----------------
            MQTT.subscribeForEachAppliance(applList);
            // ----------------
            // ----------------
            appLogs.recordLog(
                logTags.home,
                {
                    "update_appl_list": "SUCCESS",
                    "render_appl_list": "COMPLETE",
                    "appliance_list": logApplList
                }
            );
        },
        // ****************************
        //====================
        checkActivateStatus(transId) {
            let checkActStatus = _.cloneDeep(this.$config.get("check_activate_transaction"));
            checkActStatus.options.headers["x-transaction-id"] = transId;
            checkActStatus.data.transactionId = transId;
            checkActStatus.successCallback = this.checkActivateStatusSuccess.bind(this);
            checkActStatus.errorCallback = this.checkActivateStatusError.bind(this);
            this.$responseManager.execute(checkActStatus);

            appLogs.recordLog(
                logTags.buzzer,
                {
                    "action": "Check",
                    "status": "API CALL",
                    "text": "Activation status",
                    "data": { "transactionId": transId }
                }
            );
        },
        checkActivateStatusSuccess(res) {
            let response = res.responseData.response;
            let resObj = response.eventMetaData;
            let applId = resObj.applianceId;
            let message = "";
            let eventStatusName = "";
            let applianceData = _.find(this.applItems, {
                applianceId: applId
            });
            let index = applianceData.itemIndex;
            this.releaseBuzzButton(index);
            // -------------------
            let transIdCollIndex = this.btnClickedTransIdColl.indexOf(response.transactionId);
            if (transIdCollIndex > -1) {
                this.btnClickedTransIdColl.splice(transIdCollIndex, 1);
            }
            // -------------------
            if (typeof resObj.transactionResponse !== "undefined") {
                message = resObj.transactionResponse.notiMessage;
                eventStatusName = resObj.transactionResponse.eventName;
            } else {
                message = messages.notifications.blankStatus;
                eventStatusName = "error";
            }
            // -------------------
            this.showApplianceResponse(index, eventStatusName, message);
            // ************
            ButtonTransaction.recordCheckTransApiCall(res);
            // ************
            appLogs.recordLog(
                logTags.buzzer,
                {
                    "action": "Check",
                    "status": "SUCCESS",
                    "text": "Activation status",
                    "data": resObj
                }
            );
        },
        checkActivateStatusError(res) {
            if (
                typeof res.responseData !== "undefined"
                &&
                typeof res.responseData.response !== "undefined"
                &&
                typeof res.responseData.response.applianceId !== "undefined"
            ) {
                let resObj = res.responseData.response;
                let applId = resObj.applianceId;
                // let message = resObj.applianceStatusMessage;
                let applianceData = _.find(this.applItems, {
                    applianceId: applId
                });
                let index = applianceData.itemIndex;
                this.releaseBuzzButton(index);
                ButtonTransaction.recordApiCallError(res, "checkTransaction", res.responseData.response.transactionId, applId);
            } else {
                this.apiTimedOut(res, "checkTransaction");
            }
            appLogs.recordLog(
                logTags.buzzer,
                {
                    "action": "Check",
                    "status": "ERROR",
                    "text": "Activation status",
                    "data": res
                }
            );
        },
        //====================
        apiTimedOut(res, apiType) {
            this.showNotification(messages.notifications.disconnected);
            this.releaseAllBuzzButton();
            ButtonTransaction.recordApiCallError(res, apiType, uniqid(), "none");
        },
        //====================
        showApplianceResponse(i, eventStatusName, msg) {
            let errorIcon = "warning";
            let showErrorMsg = false;
            switch (eventStatusName) {
                case "activate_success": errorIcon = "none";
                    break;
                case "activate_timeout": errorIcon = "timer_off";
                    break;
                case "activate_try_again": errorIcon = "restore";
                    showErrorMsg = true;
                    break;
                case "activate_busy": errorIcon = "error_outline";
                    showErrorMsg = true;
                    break;
                case "activate_invalid": errorIcon = "not_interested";
                    showErrorMsg = true;
                    break;
                case "activate_failed": errorIcon = "error_outline";
                    break;
                default: errorIcon = "error_outline";
                    showErrorMsg = true;
                    break;
            }

            this.applItems[i].responseMsg = msg;
            if (errorIcon === "none") {
                this.applItems[i].activated = true;
            }
            else {
                this.applItems[i].buttonError = true;
                this.applItems[i].buttonErrorIcon = errorIcon;
            }
            if (showErrorMsg) {
                this.showNotification(msg);
            }
            this.$forceUpdate();
            window.setTimeout((function () {
                this.clearApplResponse(i);
            }).bind(this), 1000);
        },
        showDisconnectStatusResponse(i, msg) {
            this.applItems[i].responseMsg = msg;
            this.showNotification(msg)
            this.$forceUpdate();
            window.setTimeout((function () {
                this.clearApplResponse(i);
            }).bind(this), 1000);
        },
        clearApplResponse(i) {
            this.applItems[i].responseMsg = "";
            this.applItems[i].activated = false;
            this.applItems[i].buttonError = false;
            this.applItems[i].buttonErrorIcon = "warning";
            this.$forceUpdate();
        },
        //====================
        showNotification(msg) {
            Utils.showNotification({
                notificationText: "info",
                notificationMessage: msg
            });
        },
        //====================
        showLogoutDialog() {
            console.log("showLogoutDialog funct");
            this.confirmExitDialog = true;
        },
        exitMobileApp() {
            this.confirmExitDialog = false;
            cordova.plugins.backgroundMode.moveToBackground();
        },
        convertDate(date, timeZone) {
            if (typeof date !== "undefined" && typeof timeZone !== "undefined") {
                if (moment().isSame(date, 'day')) {
                    return moment(date).tz(timeZone).calendar();
                } else {
                    return moment(date).tz(timeZone).format('MMM D Y, h:mm a');
                }
            }
        },
        // ------------------- remove appliance from list
        showSecondDialog: function () {
            this.removeApplDialogOne = false;
            this.removeApplDialog = true;
        },
        showDeleteDialog(applianceId, applianceName) {
            this.removeApplianceName = applianceName;
            this.removeApplianceId = applianceId;
            this.removeApplDialogOne = true;
        },
        removeAppliance() {
            if (this.$refs.confirmPassForm.validate()) {
                this.removeApplianceloader = true;
                let cleanUPass = this.confirmPassword.replace(/[\u200B-\u200D\uFEFF]/g, '');
                let encPassObj = AES.encrypt(cleanUPass, passSecretKey);
                let uPass = encPassObj.toString();

                let confirmDelete = this.$config.get("delete_appl_pass");
                confirmDelete.data.password = uPass;
                confirmDelete.data.applianceId = this.removeApplianceId;
                confirmDelete.errorCallback = this.removeApplianceErr.bind(this);
                confirmDelete.successCallback = this.removeApplianceSuccess.bind(this);
                this.$responseManager.execute(confirmDelete);
            }
            // let removeAppl = this.$config.get("remove_appliance");
            // removeAppl.data.applianceId = this.removeApplianceId;
            // removeAppl.successCallback = this.removeApplianceSuccess.bind(this);
            // this.$responseManager.execute(removeAppl);
        },
        removeApplianceErr() {
            this.removeApplianceloader = false;
        },
        removeApplianceSuccess() {
            this.removeApplianceName = "";
            this.removeApplianceId = "";
            this.removeApplianceloader = false;
            this.removeApplDialog = false;
            this.refresh();
        },
        // ---------------- update bell noti counter
        getNotificationsList() {
            let bellNotiListConfig = this.$config.get("notificationsList");
            bellNotiListConfig.data.projectName = applianceTypeId;
            bellNotiListConfig.successCallback = this.updateBellNotificationList.bind(this);;
            bellNotiListConfig.errorCallback = this.errorBellNotiList.bind(this);;
            this.$responseManager.execute(bellNotiListConfig);
        },
        updateBellNotificationList() {
            this.notificationsList = this.$store.state.pushNotification.pushNotificationsList;
            this.filteredNotificationsList = [];
            for (let i = 0; i < this.notificationsList.length; i++) {
                let applianceData = _.find(this.applianceList, { applianceId: this.notificationsList[i].applianceId })
                if (typeof applianceData !== "undefined") {
                    this.filteredNotificationsList.push(this.notificationsList[i]);
                }
            }
            let newNotifcationsList = [];
            for (let i = 0; i < this.filteredNotificationsList.length; i++) {
                if (!this.filteredNotificationsList[i].isRead) {
                    newNotifcationsList.push(this.filteredNotificationsList[i]);
                }
            }
            console.log(newNotifcationsList.length, "newNotifcationsList.length");
            this.$root.$emit("UPDATE_BELL_COUNTER", newNotifcationsList.length);
        },
        errorBellNotiList() {
            console.log("bell noti list error;");
        },
    }
};
import addUserComponent from './add_user/add_user.vue';
import messages from "~/app/utils/messages/messages";

//let addUserComponent = require("./add_user/add_user.vue");
import api_config_mod from "../api_config_mod";
import moment from "moment";

export default {
    name: "OwnerUserAccessList",
    components: {
        "add-user-component": addUserComponent,
    },
    data: function () {
        return {
            name: "",
            locationName: "",
            revokeAccessDialog: false,
            revokeAccessdata: {},

            expandedList: [],
            singleExpand: false,
            userSearch: '',
            userTHeaders: [
                {
                    text: '',
                    value: 'expand',
                    align: 'left',
                    sortable: false
                }, {
                    text: 'User Name',
                    value: 'name',
                    align: 'left',
                    sortable: false
                }, {
                    text: 'Revoke Access',
                    value: 'userAccess',
                    align: 'right',
                    sortable: false
                }
            ],
            userItems: [],
            tableMsg: "",
            inlineAppLoader: false,
            applianceId: this.$store.state.chosenAppliance.applData.applianceId,
            extendUsername: "",
            extendDialog: false,
            ApiError: false,
            errorMsg: "",
            radioBtnRules: [
                (v) => v !== null || messages.rules.permission
            ],
            dateRules: {
                toDate: [
                    (v) => !!v || messages.rules.to
                ]
            },
            valid: true,
            isLifeTimeAccess: "false",
            toDate: null,
            toDialog: false,
            toMinDate: moment(new Date()).format("YYYY-MM-DD"),
            extendUserData: {},
            listLength: 0
        };
    },
    filters: {
        convertTimeStamp: function (timeStamp) {
            if (timeStamp !== "-") return moment(timeStamp).format('L');
            else return timeStamp;
        }
    },
    middleware: 'auth',
    created: function () {
    },
    mounted: function () {
        this.setTableMsg();
        this.renderApplData();
        this.getUserAccessList();
    },
    methods: {
        //-------------------------------------
        setTableMsg: function () {
            this.tableMsg = "";
        },
        renderApplData: function () {
            let applData = this.$store.state.chosenAppliance.applData;
            let userId = this.$store.state.loginStore.userInfo.userId;
            this.name = applData.applianceName;
            this.locationName = applData.applianceLocationName;
        },
        //-------------------------------------
        getUserAccessList: function () {
            if (this.$userRoleAccess(this.applianceId, 'permitApprovedOwnerList')) {
                this.inlineAppLoader = true;
                this.userSearch = "";
                api_config_mod.getUserAccessList(
                    "owner",
                    this.renderUserAccessList.bind(this)
                );
            }
        },
        renderUserAccessList: function () {
            this.inlineAppLoader = false;
            let userList = this.$store.state.userAccessList.userAccessListOwner.userInformation;
            let userPermissionInfo = this.$store.state.userAccessList.userAccessListOwner.userPermissionInfo;

            for (let i = 0; i < userList.length; i++) {
                let permissionInfo = _.find(userPermissionInfo, { userId: userList[i].userId });
                if (typeof permissionInfo !== "undefined") {
                    userList[i].permissionInfo = permissionInfo;
                }
            }

            this.userItems.splice(0, this.userItems.length);

            for (let i = 0; i < userList.length; i++) {
                this.userItems.push({
                    value: userList[i].isActive,
                    userId: userList[i].userId,
                    expand: '',
                    name: userList[i].userData.firstName + " " + userList[i].userData.lastName,
                    emailId: userList[i].userData.emailId,
                    company: userList[i].userData.company,
                    phoneNo: userList[i].userData.phoneNo,
                    permissionId: userList[i].permissionInfo.permissionId,
                    applianceId: userList[i].permissionInfo.applianceId,
                    isLifeTimeAccess: userList[i].permissionInfo.isLifeTimeAccess,
                    validFrom: (userList[i].permissionInfo.applianceAccessStartTime ? userList[i].permissionInfo.applianceAccessStartTime : "-"),
                    validTo: (userList[i].permissionInfo.applianceAccessEndTime ? userList[i].permissionInfo.applianceAccessEndTime : "-"),
                    isExpired: this.checkForExpired(userList[i].permissionInfo.applianceAccessEndTime, userList[i].permissionInfo.isLifeTimeAccess),
                    showExtend: !userList[i].permissionInfo.isLifeTimeAccess,
                    showEditRestriction: this.$userRoleAccess(this.applianceId, 'permitChangeApplianceSettingInfo'),
                    showRemove: this.$userRoleAccess(this.applianceId, 'permitRevokeAppliance')
                });
            }
            this.listLength = this.userItems.length;
            this.$root.$emit("owner_list_length", this.listLength);
        },
        //-------------------------------------
        revokeDialog: function (userData) {
            this.revokeAccessdata = { userId: userData.userId, applianceId: userData.applianceId, permissionId: userData.permissionId };
            this.revokeAccessDialog = true;
        },
        //-------------------------------------
        revokeUserAccess: function () {
            let callBackFunc = this.revokeUserAccessSucc.bind(this);
            api_config_mod.revokeUserAccess(
                "NA",
                this.revokeAccessdata.userId,
                this.revokeAccessdata.applianceId,
                this.revokeAccessdata.permissionId,
                callBackFunc
            );
        },
        revokeUserAccessSucc: function () {
            this.revokeAccessDialog = false;
            this.getUserAccessList();
        },
        refreshBtn: function () {
            this.getUserAccessList();
        },
        //-----------------------
        extendInvite: function (userData) {
            this.extendUsername = userData.name;
            this.extendDialog = true;
            this.extendUserData = {
                applianceId: userData.applianceId,
                permissionId: userData.permissionId,
                validFrom: userData.validFrom,
                validTo: userData.validTo,
            }
        },
        extendAccessConfirmed: function () {
            if (this.$refs.addUserForm.validate()) {
                let successCallBackFunc = this.extendSuccess.bind(this);
                let errorCallBackFunc = this.extendError.bind(this);
                let toTimestamp;
                if (this.isLifeTimeAccess === "true") {
                    this.isLifeTimeAccess = true;
                    toTimestamp = 0;
                } else {
                    toTimestamp = this.toDate + " 23:59";
                    this.isLifeTimeAccess = false;
                }
                api_config_mod.extendAccess(
                    this.extendUserData.applianceId,
                    this.extendUserData.permissionId,
                    this.isLifeTimeAccess,
                    toTimestamp,
                    successCallBackFunc,
                    errorCallBackFunc
                );
            }
        },
        extendSuccess: function () {
            this.extendDialog = false;
            this.resetForm();
            this.getUserAccessList();
        },
        extendError: function () {
            this.ApiError = true;
            this.errorMsg = messages.errors.invite;
            this.resetForm();
        },
        resetForm: function () {
            this.toDate = null;
            this.toDialog = false;
            this.isLifeTimeAccess = "false";
            this.$refs.addUserForm.reset();
        },
        //-----------------------
        editPermissions: function (userData) {
            let permissionData = {
                userId: userData.userId,
                applianceId: userData.applianceId,
                fullName: userData.name,
                tab: 3
            };
            this.$store.commit('userApplianceSettings/storePermissionData', permissionData);
            this.$router.push("/user_appliance_settings");

        },
        //-----------------------
        convertEndTimeStamp: function (timeStamp) {
            if (timeStamp !== "-") {
                let currentDate = moment().format('YYYY-MM-DD');
                let endDate = moment(timeStamp).format('YYYY-MM-DD');
                let result = moment(currentDate).isAfter(endDate);
                return moment(timeStamp).format('L');
            }
            else {
                return timeStamp;
            }
        },
        checkForExpired: function (timeStamp, isLifeTimeAccess) {
            if (!isLifeTimeAccess) {
                if (timeStamp !== "-") {
                    let currentDate = moment().format('YYYY-MM-DD');
                    let endDate = moment(timeStamp).format('YYYY-MM-DD');
                    let result = moment(currentDate).isAfter(endDate);
                    return result;
                }
                else {
                    return false;
                }
            }
            else {
                return false;
            }
        }
    }
};
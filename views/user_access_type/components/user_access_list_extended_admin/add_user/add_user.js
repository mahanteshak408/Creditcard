import messages from "~/app/utils/messages/messages";
import timeSchedulerComp from "../../../../../components/time_restriction_scheduler_comp.vue";

import api_config_mod from "../../api_config_mod";
import moment from 'moment';

export default {
    name: "add-extended-user-component",
    components: {
        "time-scheduler": timeSchedulerComp
    },
    data: function () {
        return {
            valid: true,
            emailIdRules: [
                (v) => !!v || messages.rules.email,
                (v) => /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v) || messages.rules.emailValid
            ],
            radioBtnRules: [
                (v) => v !== null || messages.rules.select
            ],
            userEmailId: "",
            confirmInvite: false,

            dateRules: {
                fromDate: [
                    (v) => !!v || messages.rules.from
                ],
                toDate: [
                    (v) => !!v || messages.rules.to
                ]
            },
            formReset: false,
            fromDate: null,
            toDate: null,
            fromDialog: false,
            toDialog: false,
            isLifeTimeAccess: "",
            fromMaxDate: null,
            toMaxDate: null,
            fromMinDate: moment(new Date()).format("YYYY-MM-DD"),
            toMinDate: moment(new Date()).format("YYYY-MM-DD"),
            appliancePermission: '',
            ApiError: false,
            errorMsg: "",

            isGeofencing: false,

            lazy: true,
            show: true,
            geofenceRadius: 200,
            geofenceRadiusServerSide: 200,

            options: {
                adsorb: true,
                marks: true,
                min: 200,
                max: 1000,
                interval: 100,
                dotSize: 30,
                height: 15,
                tooltip: "always"
            },

            isTimeRestriction: false,

            fullScreenDialog: false,
            defaultTimeRestriction: {},
            values: {
                setDefaultTime: false,
                type: "EA"
            },
            showTimeSchedulerComp: true

        };
    },
    created: function () {
        this.setDefaultRestrictionValues();
        this.appliancePermission = this.$getAppliancePermissionInfo(this.$store.state.chosenAppliance.applData.applianceId);
        if (!this.appliancePermission.isLifeTimeAccess) {
            this.toMaxDate = this.fromMaxDate = moment(new Date(this.appliancePermission.accessEndTimeStamp)).format("YYYY-MM-DD");
            this.fromMinDate = this.toMinDate = moment(new Date(this.appliancePermission.accessStartTimeStamp)).format("YYYY-MM-DD");
        }
        this.setLifeTimeAccess();
    },
    mounted: function () {
        this.setSchedulerInit();
    },
    watch: {
        fromDate: function (newVal, oldVal) {
            if (this.formReset) {
                if (!this.appliancePermission.isLifeTimeAccess) {
                    this.toMaxDate = this.fromMaxDate = moment(new Date(this.appliancePermission.accessEndTimeStamp)).format("YYYY-MM-DD");
                    this.fromMinDate = this.toMinDate = moment(new Date(this.appliancePermission.accessStartTimeStamp)).format("YYYY-MM-DD");
                    this.formResest = false;
                }
            } else
                this.toMinDate = newVal;
        },
        toDate: function (newVal, oldVal) {
            if (this.formReset) {
                if (!this.appliancePermission.isLifeTimeAccess) {
                    this.toMaxDate = this.fromMaxDate = moment(new Date(this.appliancePermission.accessEndTimeStamp)).format("YYYY-MM-DD");
                    this.fromMinDate = this.toMinDate = moment(new Date(this.appliancePermission.accessStartTimeStamp)).format("YYYY-MM-DD");
                    this.formResest = false;
                }
            } else
                this.fromMaxDate = newVal;
        },
    },
    methods: {
        //-------------------------------------
        setDefaultRestrictionValues: function () {
            let applData = this.$store.state.chosenAppliance.applData;
            this.geofenceRadius = applData.defaultGeoFencingRadius;
            this.geofenceRadiusServerSide = applData.defaultGeoFencingRadius;
        },
        setSchedulerInit: function () {
            this.defaultTimeRestriction = this.$store.state.timeRestrictionStore.serverTimeRestriction;
        },
        //-------------------------------------
        setLifeTimeAccess: function () {
            this.appliancePermission = this.$getAppliancePermissionInfo(this.$store.state.chosenAppliance.applData.applianceId);
            if (!this.appliancePermission.isLifeTimeAccess) {
                this.isLifeTimeAccess = "false";
            }
            else {
                this.isLifeTimeAccess = "true";
            };
            console.log("setLifeTimeAccess", this.isLifeTimeAccess);
        },
        //-------------------------------------
        inviteExtendedAdmin: function () {
            if (this.$refs.addUserForm.validate()) {
                let geoRaduis = (this.isGeofencing ? this.geofenceRadius : this.geofenceRadiusServerSide);
                let successCallBackFunc = this.inviteSuccess.bind(this);
                let errorCallBackFunc = this.inviteError.bind(this);
                let fromTimestamp;
                let toTimestamp;
                if (this.isLifeTimeAccess === "true") {
                    this.isLifeTimeAccess = true;
                    fromTimestamp = 0;
                    toTimestamp = 0;
                } else {
                    if (this.fromDate === this.toDate) {
                        fromTimestamp = this.fromDate + " 00:00";
                        toTimestamp = this.toDate + " 23:59";
                    }
                    else {
                        fromTimestamp = this.fromDate + " 00:00";
                        toTimestamp = this.toDate + " 00:00";
                    }
                    this.isLifeTimeAccess = false;
                };
                api_config_mod.inviteUser(
                    "ext",
                    this.userEmailId.toLowerCase(),
                    this.isLifeTimeAccess,
                    fromTimestamp,
                    toTimestamp,
                    this.isGeofencing,
                    geoRaduis,
                    this.isTimeRestriction,
                    this.defaultTimeRestriction,
                    successCallBackFunc,
                    errorCallBackFunc
                );
                this.tempData = {
                    emailId: this.userEmailId.toLowerCase(),
                    lifeTimeAccess: this.isLifeTimeAccess,
                    fromTimestamp: fromTimestamp,
                    toTimestamp: toTimestamp,
                    isGeofencing: this.isGeofencing,
                    geofenceRadius: geoRaduis,
                    isTimeRestriction: this.isTimeRestriction,
                    defaultTimeRestriction: this.defaultTimeRestriction
                };
            }
        },
        resetForm: function () {
            this.formResest = true;
            this.fromDate = null;
            this.toDate = null;
            this.fromDialog = false;
            this.toDialog = false;
            this.$refs.addUserForm.reset();
            this.isGeofencing = false;
            this.isTimeRestriction = false;
            this.setDefaultRestrictionValues();
            this.setSchedulerInit();
            this.setLifeTimeAccess();
        },
        updateView: function () {
            this.resetForm();
            this.$parent.getUserAccessList();
        },
        inviteSuccess: function () {
            console.log(this.$store.state.userAccessList.addExtendedAdminResponse);
            if (this.$store.state.userAccessList.addExtendedAdminResponse.promptInvite) {
                this.confirmInvite = true;
            }
            else {
                this.updateView();
            }
        },
        inviteError: function () {
            this.ApiError = true;
            this.errorMsg = this.$store.state.userAccessList.addExtendedAdminResponse.message;
            this.updateView();
        },
        //-------------------------------------
        inviteConfirmed: function () {
            let applianceId = this.$store.state.chosenAppliance.applData.applianceId;
            let successCallBackFunc = this.inviteConfirmedSuccess.bind(this);
            let failureCallbackFunc = this.inviteConfirmedError.bind(this);
            //------------------------------------------
            api_config_mod.registerUser(
                "ext",
                applianceId,
                this.tempData.emailId,
                this.tempData.lifeTimeAccess,
                this.tempData.fromTimestamp,
                this.tempData.toTimestamp,
                this.tempData.isGeofencing,
                this.tempData.geofenceRadius,
                this.tempData.isTimeRestriction,
                this.tempData.defaultTimeRestriction,
                successCallBackFunc,
                failureCallbackFunc
            );
        },
        inviteConfirmedSuccess: function () {
            this.confirmInvite = false;
            this.updateView();
        },
        inviteConfirmedError: function () {
            this.confirmInvite = false;
            this.ApiError = true;
            this.errorMsg = messages.errors.invite;
            this.resetForm();
        },
        confirmInviteCloseDialog: function () {
            this.confirmInvite = false;
            this.updateView();
        },
        //-------------------------------------
        addUserDialogCancel: function () {
            this.$refs.addUserForm.reset();
            this.addUserDialog = false;
        },
        geofenceRadiusChange: function (meters) {
            this.geofenceRadius = meters;
        },
        //----------------------------------------
        showTimeRestDialog: function () {
            console.log("showTimeRestDialog");
            if (this.isTimeRestriction) {
                this.fullScreenDialog = true;
                setTimeout(() => {
                    this.$refs.timeSchedulerComponent.renderCheckBoxList(this.defaultTimeRestriction);
                }, 500);
            };
        },
        closeTimeRestDialog: function () {
            this.fullScreenDialog = false;
        },
        //----------------------------------
        saveTimeScheduler: function () {
            this.defaultTimeRestriction = this.$store.state.timeRestrictionStore.savedTimeRestrictionEA;
            this.fullScreenDialog = false;
        }
    }
};
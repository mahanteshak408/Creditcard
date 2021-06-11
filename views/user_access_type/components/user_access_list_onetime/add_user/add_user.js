import vueTelComponent from "../../../../../components/vue2-tel-input/vue2TelInput.vue";
import moment from 'moment';
import messages from "~/app/utils/messages/messages";

import api_config_mod from "../../api_config_mod";

export default {
    name: "add-user-component",
    components: {
        "vue-tel-component": vueTelComponent,
    },
    data: function () {
        return {
            valid: true,
            confirmInvite: false,
            emailIdRules: [
                (v) => /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v) || messages.rules.emailValid
            ],
            singleuseNameRules: [
                (v) => !!v || messages.rules.singleUseName,
            ],
            phoneRules: [
                (v) => !!v || messages.rules.phone,
            ],
            dateRules: [
                (v) => !!v || messages.rules.date
            ],
            radioBtnRules: [
                (v) => v !== -1 || messages.rules.duration
            ],
            timeRules: {
                from: (v) => !!v || messages.rules.fromTime,
                to: (v) => !!v || messages.rules.toTime
            },

            addUserDialog: false,
            userEmailId: "",
            userPhoneNo: "",
            disableButton: false,
            validNumber: true,
            addUserFormModal: false,
            dateDialog: false,
            date: null,
            singleUseDuration: 0,
            fromTime: null,
            formattedFromTime: "",
            fromTimeMenuModel: false,
            toTime: null,
            formattedToTime: "",
            toTimeMenuModel: false,
            minDate: moment(new Date()).format("YYYY-MM-DD"),
            maxDate: null,
            appliancePermission: '',
            showAlert: false,
            userPhoneNo: "",
            ApiError: false,
            errorMsg: "",
            singleusername: ""
        };
    },
    watch: {
        fromTime: function (newVal, oldVal) {
            if (this.fromTime !== null) this.formattedFromTime = moment(this.fromTime, "hh:mm").format("hh:mma");
        },
        toTime: function (newVal, oldVal) {
            if (this.toTime !== null) this.formattedToTime = moment(this.toTime, "hh:mm").format("hh:mma");
        }
    },
    created: function () {
        this.appliancePermission = this.$getAppliancePermissionInfo(this.$store.state.chosenAppliance.applData.applianceId);
        if (!this.appliancePermission.isLifeTimeAccess) {
            this.minDate = moment(new Date(this.appliancePermission.accessStartTimeStamp)).format("YYYY-MM-DD");
            this.maxDate = moment(new Date(this.appliancePermission.accessEndTimeStamp)).format("YYYY-MM-DD");
        }
    },
    methods: {
        radioClicked:function(){
            console.log(this.singleUseDuration);
        },
        //---------------validation------------------------
        isFromTimeValid: function (time) {
            if (this.date === moment(new Date()).format("YYYY-MM-DD"))
                if (moment(this.fromTime, "hh:mm").isBefore(moment(new Date())))
                    return messages.pickers.selectedTime;
            return true;
        },
        isToTimeValid: function (time) {
            if (this.date === moment(new Date()).format("YYYY-MM-DD"))
                if (moment(this.toTime, "hh:mm").isBefore(moment(new Date())))
                    return messages.pickers.selectedTime;
            return true;
        },
        fromTimeChecker: function (time) {
            if (!this.toTime) return true;
            if (moment(this.fromTime, "hh:mm").isBefore(moment(this.toTime, "hh:mm")))
                return true;
            return messages.pickers.fromLesserTime;
        },
        toTimeChecker: function (time) {
            if (!this.fromTime) return true;
            if (moment(this.fromTime, "hh:mm").isBefore(moment(this.toTime, "hh:mm")))
                return true;
            return messages.pickers.toLesserTime;
        },
        //--------------------------------------
        inviteOnetimeuser: function () {
            //this.$refs.telComponent.validate();
            if (this.$refs.nameForm.validate() && this.$refs.addUserForm.validate()) {
                if (this.$refs.telComponent.userNumber !== "") {
                    this.showAlert = false;
                    this.userPhoneNo = this.$refs.telComponent.userNumber;
                    this.confirmInvite = true;
                }
                else if (this.userEmailId !== "") {
                    if (this.$refs.emailForm.validate()) {
                        this.showAlert = false;
                        this.confirmInvite = true;
                    }
                }
                else {
                    this.showAlert = true;
                }
            }
        },
        getTime: function (time) {
            let date = this.date + " " + time;
            return date;
        },
        inviteConfirmed: function () {
            let successCallBackFunc = this.hideAddUserDialog.bind(this);
            let errorCallBackFunc = this.inviteError.bind(this);
            this.$refs.telComponent.userNumber;
            let fromTime = (this.singleUseDuration === 0) ? this.getTime("00:00") : this.getTime(this.fromTime);
            let toTime = (this.singleUseDuration === 0) ? this.getTime("23:59") : this.getTime(this.toTime);

            let emailId = (this.userEmailId ? this.userEmailId.toLowerCase() : "")
            api_config_mod.inviteOneTimeUser(
                this.singleusername,
                emailId,
                this.$refs.telComponent.phoneNo.dialCode + "-" +
                this.$refs.telComponent.phoneNo.number,
                fromTime,
                toTime,
                successCallBackFunc,
                errorCallBackFunc
            );
        },
        hideAddUserDialog: function () {
            this.confirmInvite = false;
            this.$refs.addUserForm.reset();
            this.$refs.nameForm.reset();
            this.$refs.emailForm.reset();
            this.$refs.telComponent.userNumber = "";
            this.showAlert = false;
            this.fromTime = null;
            this.toTime = null;
            this.singleUseDuration = 0;
            this.$parent.getUserAccessList();
        },
        inviteError: function () {
            this.ApiError = true;
            this.errorMsg = messages.errors.invite;
            this.hideAddUserDialog();
        },
        telInputUpdate: function (data) {
            console.log(data, "event emitted");
        },
        //-------------------------------------
        importFromContacts: function () {
            let that = this;
            document.addEventListener("deviceready", (function onDeviceReady() {
                if (typeof navigator.contacts !== "undefined") {
                    navigator.contacts.pickContact((function (contact) {
                        (that.populateContactDetails.bind(that))(contact);
                    }).bind(this), function (err) {
                        console.log('Error: ' + err);
                    });
                }
            }).bind(this), false);
        },
        populateContactDetails: function (contact) {
            let name = contact.name.formatted;
            let emails = contact.emails;
            let nos = contact.phoneNumbers;

            console.log("name");
            console.log(name);
            console.log("emails");
            console.log(emails);
            console.log("nos");
            console.log(nos);

            if (typeof this.singleusername !== "undefined" && this.singleusername.length > 0)
                this.singleusername = "";
            if (typeof this.userEmailId !== "undefined" && this.userEmailId.length > 0)
                this.userEmailId = "";
            if (typeof this.$refs.telComponent.userNumber !== "undefined" && this.$refs.telComponent.userNumber.length > 0)
                this.$refs.telComponent.userNumber = "";

            this.renderContact(name, emails, nos);

        },
        renderContact: function (name, emails, nos) {
            if (name !== null)
                this.singleusername = name;

            if (nos !== null)
                this.$refs.telComponent.populateNoFromContact(nos[0].value);

            if (emails !== null)
                this.userEmailId = emails[0].value;

        },
        //-------------------------------------
        addUserDialogCancel: function () {
            this.$refs.addUserForm.reset();
            this.addUserDialog = false;
        }
    }
};
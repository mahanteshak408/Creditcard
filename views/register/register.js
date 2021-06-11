import  vueTelComponent from "../../components/vue2-tel-input/vue2TelInput.vue";
import messages from "~/app/utils/messages/messages";
import { passSecretKey } from "../../static/app_config";
import AES from "crypto-js/aes";

export default{
    name: "LandingView",
    components: {
        "vue-tel-component":vueTelComponent
    },
    data: function () {
        return {
            valid: true,
            showPassword: true,
            showCPass: true,

            firstNameRules: [
                (v) => !!v || messages.rules.firstname
            ],
            lastNameRules: [
                (v) => !!v || messages.rules.lastname
            ],
            emailIdRules: [
                (v) => !!v || messages.rules.email,
                (v) => /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v) || messages.rules.emailValid
            ],
            userPasswordRules: [
                (v) => !!v || messages.rules.password
            ],
            confirmPasswordRules: [
                (v) => !!v || messages.rules.confirmPassword,
                (v) => v === this.userPassword || messages.rules.samePassword
            ],
            phoneRules: [
                (v) => !!v || messages.rules.phone
            ],

            emailId: "",
            userPassword: "",
            firstName: "",
            lastName: "",
            company: "",
            confirmPassword: "",
            phone: ""
        };
    },
    created : function () {
    },
    watch : {
        userPassword : function () {
            if(this.userPassword === this.confirmPassword) this.$refs.registerForm.validate();
        }
    },
    methods : {
        registerUser(){
            //----------------------------------------------
            this.$refs.telComponent.validate();
            let isPhNoValid = this.$refs.telComponent.valid && this.$refs.telComponent.userNumber !== '';
            //----------------------------------------------------
            if (this.$refs.registerForm.validate() && isPhNoValid) {
                let cleanRPass = this.userPassword.replace(/[\u200B-\u200D\uFEFF]/g, '');
                let encRPassObj = AES.encrypt(cleanRPass, passSecretKey);
                let rPass = encRPassObj.toString();

                let registerUserConfig = this.$config.get("register_user");
                registerUserConfig.data = {
                    userName: this.emailId.toLowerCase(),
                    password: rPass,
                    userData: {
                        firstName: this.firstName,
                        lastName: this.lastName,
                        company: this.company,
                        emailId: this.emailId.toLowerCase(),
                        phoneNo: this.$refs.telComponent.phoneNo.dialCode + "-" + this.$refs.telComponent.phoneNo.number7
                    }
                };
                registerUserConfig.successCallback = this.registerCallback.bind(this);;
                this.$responseManager.execute(registerUserConfig);
            }
        },
        registerCallback () {
        },
    }
};
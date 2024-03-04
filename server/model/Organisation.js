import mongoose from "mongoose"

const organisataionSchema = new mongoose.Schema({
    firstname: {
        type: String,
        required: true
    },
    lastname: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    mobile: {
        type: String,
        required: true,
        unique: true
    },
    usertype: {
        type: String,
        default: "organisation"
    },
    accounttype: {
        type: String,
        default: "freemium",
    },
    credits: {
        type: Number,
        default: 20
    },
    isverified: {
        email: {
            type: Boolean,
            default: false
        },
        mobile: {
            type: Boolean,
            default: false
        }
    },
    verificationcode: {
        email: {
            type: String,
            required: true
        },
        mobile: {
            type: String,
            required: true
        }
    },
    teams: [{
        teamname: {
            type: String,
            required: true,
            unique: true
        },
        members: [{
            tasks : {
                type : [mongoose.Schema.Types.ObjectId],
                ref : "OrgTask"
            },
            firstname: {
                type: String,
                required: true
            },
            email: { 
                type: String,
                required: true
            },
            mobile: {
                type: String,
                required: true
            },
            isverified: {
                email: {
                    type: Boolean,
                    default: false
                },
                mobile: {
                    type: Boolean,
                    default: false
                }
            },
            verificationcode: {
                email: {
                    type: String,
                    required: true
                },
                mobile: {
                    type: String,
                    required: true
                }
            },            
        }]
    }]
})

const OrganisationTaskyModel = new mongoose.model(
    "Organisation",
    organisataionSchema,
    "organisations"
);


export default OrganisationTaskyModel;
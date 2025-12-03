// import axios from "axios";

//TWILIO SMS
import twilio from "twilio";  // for twilio sms


const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER!;

const client = twilio(accountSid, authToken);

export async function sendSMS(to: string, message: string) {
  try {
    console.log("Sending SMS...");
    console.log("FROM:", twilioPhone);
    console.log("TO:", to);

    const result = await client.messages.create({
      body: message,
      from: twilioPhone, 
      to: to,            
    });

    console.log("Twilio Message SID:", result.sid);
    return { success: true, sid: result.sid };
  } catch (error: any) {
    console.error("Twilio ERROR:", error);

    return {
      success: false,
      status: error.status,
      code: error.code,
      message: error.message,
      moreInfo: error.moreInfo,
    };
  }
}


//CLOUD SMS

// export async function sendSMS(phone: string, message: string) {
//   try {
//     const key = process.env.CLOUDSMS_APP_KEY!;
//     const secret = process.env.CLOUDSMS_APP_SECRET!;
//     const sender = process.env.CLOUDSMS_SENDER_ID!;

//     const authToken = Buffer.from(`${key}:${secret}`).toString("base64");

//     const response = await axios.post(
//       process.env.CLOUDSMS_API_URL!,
//       {
//         destination: phone.toString(),  // FIXED — CloudSMS supports string format
//         message: message,
//         type: "sms"
//       },
//       {
//         headers: {
//           Authorization: `Basic ${authToken}`,
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     console.log("✅ CloudSMS SUCCESS:", response.data);
//     return response.data;

//   } catch (err: any) {
//     console.error("❌ CloudSMS ERROR:", err.response?.data || err.message);
//     return null;
//   }
// }


//Semaphore SMS
// export async function sendSMS(phone: string, message: string) {
//   try {
//     const apiKey = process.env.SEMAPHORE_API_KEY!;
//     const url = process.env.SEMAPHORE_API_URL!;

//     const response = await axios.post(
//       url,
//       {
//         apikey: apiKey,
//         number: phone,         // PH number: 639xxxx
//         message: message,
//         sendername: "SEMAPHORE"
//       },
//       {
//         headers: {
//           "Content-Type": "application/json"
//         }
//       }
//     );

//     console.log("✅ Semaphore SUCCESS:", response.data);
//     return response.data;

//   } catch (err: any) {
//     console.error("❌ Semaphore ERROR:", err.response?.data || err.message);
//     return null;
//   }
// }


//INFOBIP SMS
// export async function sendSMS(phone: string, message: string) {
//   try {
//     const response = await axios.post(
//       process.env.INFOBIP_API_URL!,
//       {
//         messages: [
//           {
//             from: "ServiceSMS",   
//             destinations: [{ to: phone }],
//             text: message
//           }
//         ]
//       },
//       {
//         headers: {
//           Authorization: `App ${process.env.INFOBIP_API_KEY}`,
//           "Content-Type": "application/json",
//           Accept: "application/json"
//         }
//       }
//     );

//     console.log("📨 Infobip Response:", response.data);
//     return response.data;

//   } catch (err: any) {
//     console.error("❌ Infobip ERROR:", err.response?.data || err.message);
//     return null;
//   }
// }



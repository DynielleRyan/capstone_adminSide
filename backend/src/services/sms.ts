import axios from "axios";

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
export async function sendSMS(phone: string, message: string) {
  try {
    const apiKey = process.env.SEMAPHORE_API_KEY!;
    const url = process.env.SEMAPHORE_API_URL!;

    const response = await axios.post(
      url,
      {
        apikey: apiKey,
        number: phone,         // PH number: 639xxxx
        message: message,
        sendername: "SEMAPHORE"
      },
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    console.log("✅ Semaphore SUCCESS:", response.data);
    return response.data;

  } catch (err: any) {
    console.error("❌ Semaphore ERROR:", err.response?.data || err.message);
    return null;
  }
}
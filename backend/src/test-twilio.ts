// src/test-twilio-direct.ts  (run from backend project)
import twilio from "twilio";
import "dotenv/config";

const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);

async function main() {
  try {
    const msg = await client.messages.create({
      body: "Direct sender test",
      to: process.env.ADMIN_PHONE!,               // +63...
      from: process.env.TWILIO_FROM_NUMBER!,     // +1 515 436 4475
    });
    console.log("Sent:", msg.sid);
  } catch (e:any) {
    console.error("ERROR:", e.code, e.message);
  }
}
main();

const { TextractClient, AnalyzeDocumentCommand } = require("@aws-sdk/client-textract");
require("dotenv").config({ path: ".env.local" });

const client = new TextractClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

async function test() {
    try {
        console.log("Pinging AWS Textract...");
        // Sending a dummy command just to check authentication
        await client.send(new AnalyzeDocumentCommand({ Document: { Bytes: Buffer.from("test") }, FeatureTypes: ["TABLES"] }));
    } catch (error) {
        if (error.name === "SubscriptionRequiredException") {
            console.log("❌ AWS Account is still locked/unverified.");
        } else if (error.name === "InvalidParameterException") {
            console.log("✅ AWS Account is VERIFIED! (It threw a parameter error because we sent dummy data, which means it let us in!)");
        } else {
            console.log("Other error:", error.name);
        }
    }
}

test();

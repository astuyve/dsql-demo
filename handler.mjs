import { DsqlSigner } from "@aws-sdk/dsql-signer";
import tracer from "dd-trace";
import pg from "pg";
const { Client } = pg;
let client = null;
async function generateToken(endpoint, region, parent_span) {
  const signer = new DsqlSigner({
    hostname: endpoint,
    region,
  });
  try {
    // Use `getDbConnectAuthToken` if you are _not_ logging in as `admin` user
    const span = tracer.startSpan('dd-sql-token', { endpoint, childOf: parent_span})
    const token = await signer.getDbConnectAdminAuthToken(endpoint, region);
    span.finish();
    console.log(token);
    return token;
  } catch (error) {
      console.error("Failed to generate token: ", error);
      throw error;
  }
}
// To connect with a custom database role, set user as the database role name
async function dsql_sample(endpoint, parent_span) {

  if (!client) {
    const token = await generateToken(endpoint, "us-east-1", parent_span);
    const localClient = new Client({
        user: "admin",
        database: "postgres",
        host: endpoint,
        password: token,
        ssl: { 
          rejectUnauthorized: false
        },
      });
    const span = tracer.startSpan('dd-sql-connect', { endpoint, childOf: parent_span})
    await localClient.connect();
    span.finish();
    client = localClient;
    console.log("[dsql_sample] connected to dsql!");
  }

  try {
    console.log("[dsql_sample] attempting transaction.");
    const span = tracer.startSpan('dd-sql-txn', { endpoint, childOf: parent_span})
    await client.query("BEGIN; SELECT txid_current_if_assigned(); COMMIT;");
    span.finish();
    console.log("[dsql_sample] transaction done.");
    return 200;
  } catch (err) {
    console.log("[dsql_sample] transaction attempt failed!");
    console.error(err);
    return 500;
  } finally {
    //await client.end();
  }
}

export const handler = async (event) => {
  const endpoint = process.env.DSQL_ENDPOINT;
  const span = tracer.startSpan('dd-sql-end-to-end', { endpoint, childOf: tracer.scope().active()})
  const responseCode = await dsql_sample(endpoint, span);
  span.finish();

  console.log('ASTUYVE - returning response');
  const response = {
    statusCode: responseCode,
    endpoint: endpoint,
  };
  return JSON.stringify(response);
};

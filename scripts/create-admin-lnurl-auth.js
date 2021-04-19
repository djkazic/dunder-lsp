const fastify = require("fastify")();
const qrcode = require("qrcode-terminal");
const getDb = require("../dist/db/db").default;
const { createLnUrlAuth, bytesToHexString, generateBytes } = require("../dist/utils/common");

(async () => {
  const db = await getDb();

  const host = process.argv[2];
  const useHttps = process.argv[3] === "true";
  const name = process.argv[4];
  if (!host) {
    console.log(`USAGE:\n   create-admin-lnurl-auth.js host [use https (true/false)] [name]`);
    process.exit(0);
  }

  const domain = host.split(":")[0];
  const port = Number.parseInt(host.split(":")[1] ?? "8089");

  fastify.get("/lnurl-auth", async (request, reply) => {
    const pubkey = request.query.key;
    await db.run("INSERT INTO admin (pubkey, name) VALUES ($pubkey, $name)", {
      $pubkey: pubkey,
      $name: name ?? "Admin",
    });
    reply.send({ status: "OK" });
    console.log("Done");
    process.exit(0);
  });

  fastify.listen(port, domain, async (error, address) => {
    if (error) {
      console.error(error);
      process.exit(1);
    }
    console.log(`Server listening at ${address}\n`);
    console.log("Scan QR code with an LNURL-auth compatible wallet");
    const url = `${useHttps ? "https" : "http"}://${domain}:${port}/lnurl-auth`;
    const lnurlAuthBech32 = createLnUrlAuth(bytesToHexString(await generateBytes(32)), url);
    qrcode.generate(lnurlAuthBech32.toUpperCase(), { small: true });
    console.log(lnurlAuthBech32);
  });
})();

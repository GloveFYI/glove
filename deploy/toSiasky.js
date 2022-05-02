const { SkynetClient, genKeyPairFromSeed } = require("@skynetlabs/skynet-nodejs");

async function deploy(portalUrl, seed, dataKey, dir) {
  
  const skynetClient = new SkynetClient(portalUrl);
  const { publicKey, privateKey } = genKeyPairFromSeed(seed);

  const newSkylink = await skynetClient.uploadDirectory(dir);

  const [ resolverSkylink ] = await Promise.all([
    skynetClient.registry.getEntryLink(publicKey, dataKey),
    skynetClient.db.setDataLink(privateKey, dataKey, newSkylink)
  ]);

  console.log(`Deployed current @ ${newSkylink}. Resolver Skylink: ${resolverSkylink}`);
}

module.exports = deploy;
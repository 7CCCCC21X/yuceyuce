module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    ok: true,
    time: new Date().toISOString(),
    runtime: "vercel-node",
    node: process.version
  });
};

const getHello = (req, res) => {
  res.status(200).json({ message: "Hello, World!" });
};

const getHealth = (req, res) => {
  res.status(200).json({ status: "ok" });
};

module.exports = { getHello, getHealth };
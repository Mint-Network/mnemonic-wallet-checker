import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { ethers } from "ethers";
// import { derivePath } from "ed25519-hd-key";
// import * as bip39 from "bip39";
// import { Keypair } from "@solana/web3.js";
// import { Buffer } from "buffer";
// window.Buffer = Buffer;

const ethProvider = new ethers.JsonRpcProvider("https://eth.llamarpc.com");
const codexProvider = new ethers.JsonRpcProvider(
  "https://node-mainnet.codexnetwork.org",
);
// get currency paths according to the user selected currency
const currencyPaths = {
  ETH: "m/44'/60'/0'/0/",
  BTC: "m/84'/0'/0'/0/",
  LTC: "m/84'/2'/0'/0/",
  BCH: "m/44'/145'/0'/0/",
  // SOL: "m/44'/501'/0'/0'",
};
// list of currencies which do not support balance display
const noBalanceCurrencyDisplay = ["BTC", "LTC", "BCH"];
function App() {
  const [selectedType, setSelectedType] = useState("xpub");
  const [currencyType, setCurrencyType] = useState("ETH");
  const [inputValue, setInputValue] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  // by deafualt current page is 1
  const [currentPage, setCurrentPage] = useState(1);
  // number of items to show per page
  const itemsPerPage = 25;

  // Clear input and results when type or currency changes and set to default page number 1
  useEffect(() => {
    setResults([]);
    setInputValue("");
    setCurrentPage(1);
  }, [selectedType, currencyType]);

  const getRootFromMnemonic = (mnemonic) => {
    try {
      return ethers.HDNodeWallet.fromPhrase(mnemonic.trim(), undefined, "m");
    } catch (e) {
      console.error("Invalid mnemonic:", e);
      return null;
    }
  };

  const getRootFromXpub = (xpub, currency) => {
    try {
      // if (currency === "SOL")
      //   throw new Error("SOL xpub derivation not supported, use mnemonic.");
      return ethers.HDNodeWallet.fromExtendedKey(xpub.trim());
    } catch (e) {
      console.error("Invalid xpub:", e);
      return null;
    }
  };

  // const getSolanaKeyPair = (mnemonic, index) => {
  //   if (!bip39.validateMnemonic(mnemonic)) {
  //     throw new Error("Invalid BIP39 mnemonic");
  //   }

  //   const seed = bip39.mnemonicToSeedSync(mnemonic);
  //   const path = `m/44'/501'/${index}'/0'`;

  //   const { key } = derivePath(path, seed.toString("hex"));
  //   return Keypair.fromSeed(key);
  // };

  const getChildFromMnemonic = (root, index, currency, mnemonic) => {
    try {
      const basePath = currencyPaths[currency];
      if (!basePath) throw new Error("Unsupported currency");
      const path = `${basePath}${index}`;
      const child = root.derivePath(path);
      return { address: child.address, path };
    } catch (e) {
      console.error("Error deriving child:", e);
      return null;
    }
  };

  const getChildFromXpub = (root, index, currency) => {
    try {
      // if (currency === "SOL") throw new Error("SOL does not support xpub");
      const child = root.deriveChild(index);
      return { address: child.address, path: `xpub/${index}` };
    } catch (e) {
      console.error("Error deriving child:", e);
      return null;
    }
  };

  const deriveAddresses = async (page = 1) => {
    try {
      if (!inputValue) {
        alert("Enter your mnemonic or xpub");
        return;
      }

      setLoading(true);
      setResults([]);

      const root =
        selectedType === "xpub"
          ? getRootFromXpub(inputValue, currencyType)
          : getRootFromMnemonic(inputValue);

      if (!root && selectedType !== "mnemonic") {
        alert("Invalid input");
        return;
      }

      const data = [];
      // Logic for indices calculation for the pagintaion part
      const startIndexForData = (page - 1) * itemsPerPage;
      const endIndexForData = startIndexForData + itemsPerPage;

      for (let i = startIndexForData; i < endIndexForData; i++) {
        const child =
          selectedType === "xpub"
            ? getChildFromXpub(root, i, currencyType)
            : getChildFromMnemonic(root, i, currencyType, inputValue);

        if (!child) continue;

        if (noBalanceCurrencyDisplay.includes(currencyType)) {
          data.push({ index: i + 1, address: child.address, path: child.path });
          continue;
        }

        const [ethBalRes, codexBalRes] = await Promise.allSettled([
          ethProvider.getBalance(child.address),
          codexProvider.getBalance(child.address)
        ]);

        data.push({
          index: i + 1,
          address: child.address,
          path: child.path,
          ethBalance:
            ethBalRes.status === "fulfilled"
              ? ethers.formatEther(ethBalRes.value)
              : "-",
          codexBalance:
            codexBalRes.status === "fulfilled"
              ? ethers.formatEther(codexBalRes.value)
              : "-",
        });
      }
      setResults(data);
      setCurrentPage(page);
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div style={{ padding: 20, fontFamily: "sans-serif" }}>
      <h2>Address Generator</h2>

      {/* Key type and currency selection */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ marginRight: 16 }}>
          <input
            type="radio"
            name="keyType"
            value="xpub"
            disabled={loading}
            checked={selectedType === "xpub"}
            onChange={() => setSelectedType("xpub")}
          />{" "}
          Extended Public Key
        </label>

        <label style={{ marginRight: 16 }}>
          <input
            type="radio"
            name="keyType"
            value="mnemonic"
            disabled={loading}
            checked={selectedType === "mnemonic"}
            onChange={() => setSelectedType("mnemonic")}
          />{" "}
          Mnemonic
        </label>

        <label>
          Currency:{" "}
          <select
            value={currencyType}
            disabled={loading}
            onChange={(e) => setCurrencyType(e.target.value)}
            style={{ marginLeft: 8, padding: 4 }}
          >
            <option value="ETH">ETH</option>
            <option value="BTC">BTC</option>
            <option value="LTC">LTC</option>
            <option value="BCH">BCH</option>
          </select>
        </label>
      </div>

      {/* Input field for mnemonic or xpub */}
      <textarea
        rows={3}
        placeholder={
          selectedType === "xpub" ? "Enter xpub here" : "Enter your 12/24-word mnemonic here"
        }
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        disabled={loading}
        style={{ width: "100%", padding: 8 }}
      />

      {/* Fetch addresses button */}
      <button
        onClick={() => deriveAddresses(1)} // default start from page 1
        disabled={loading}
        style={{ marginTop: 10, padding: "8px 16px" }}
      >
        {loading ? "Loading..." : "Show Addresses"}
      </button>

      {/* Table showing results */}
      {results.length > 0 && (
        <>
          <table
            border="1"
            cellPadding="6"
            style={{ marginTop: 20, width: "100%", borderCollapse: "collapse" }}
          >
            <thead>
              <tr>
                <th>#</th>
                <th>Address</th>
                <th>Derivation Path</th>
                {!noBalanceCurrencyDisplay.includes(currencyType) && (
                  <>
                    <th>ETH Balance</th>
                    <th>Codex Balance</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.index}>
                  <td>{r.index}</td>
                  <td>{r.address}</td>
                  <td>{r.path}</td>
                  {!noBalanceCurrencyDisplay.includes(currencyType) && (
                    <>
                      <td>{r.ethBalance}</td>
                      <td>{r.codexBalance}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination: previous / current / next */}
          <div
            style={{
              marginTop: 10,
              display: "flex",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <button
              disabled={currentPage === 1 || loading}
              onClick={() => deriveAddresses(currentPage - 1)}
            >
              Prev
            </button>

            <button disabled style={{ fontWeight: "bold" }}>
              {currentPage}
            </button>

            <button
              disabled={currentPage * itemsPerPage >= 100 || loading}
              onClick={() => deriveAddresses(currentPage + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);

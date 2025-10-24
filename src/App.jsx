import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { ethers } from "ethers";

function App() {
  const [mnemonic, setMnemonic] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const deriveAddresses = async () => {
    try {
      setLoading(true);
      // Use the root path "m" so we can derive child paths
      const root = ethers.HDNodeWallet.fromPhrase(mnemonic.trim(), undefined, "m");
      const ethProvider = new ethers.JsonRpcProvider("https://eth.llamarpc.com");
      const codexProvider = new ethers.JsonRpcProvider("https://node-mainnet.codexnetwork.org");
      const data = [];

      for (let i = 0; i <= 20; i++) {
        const path = `m/44'/60'/0'/0/${i}`;
        const child = root.derivePath(path);
        const [ethBalRes, codexBalRes] = await Promise.allSettled([
          ethProvider.getBalance(child.address),
          codexProvider.getBalance(child.address)
        ]);
        const ethBalance = ethBalRes.status === "fulfilled" ? ethers.formatEther(ethBalRes.value) : "-";
        const codexBalance = codexBalRes.status === "fulfilled" ? ethers.formatEther(codexBalRes.value) : "-";
        data.push({ index: i, address: child.address, ethBalance, codexBalance });
      }
      setResults(data);
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif" }}>
      <h2>Mnemonics to Address generator</h2>
      <textarea
        rows={3}
        placeholder="Enter your 12/24-word mnemonic here"
        value={mnemonic}
        onChange={(e) => setMnemonic(e.target.value)}
        style={{ width: "100%", padding: 8 }}
      />
      <button
        disabled={loading}
        onClick={deriveAddresses}
        style={{ marginTop: 10, padding: "8px 16px" }}
      >
        {loading ? "Loading..." : "Show Addresses"}
      </button>

      {results.length > 0 && (
        <table
          border="1"
          cellPadding="6"
          style={{ marginTop: 20, width: "100%", borderCollapse: "collapse" }}
        >
          <thead>
            <tr>
              <th>#</th>
              <th>Address</th>
              <th>ETH Balance</th>
              <th>Codex Balance</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.index}>
                <td>{r.index}</td>
                <td>{r.address}</td>
                <td>{r.ethBalance}</td>
                <td>{r.codexBalance}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);

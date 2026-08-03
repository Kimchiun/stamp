import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import solc from "solc";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function findImports(importPath) {
  if (importPath.startsWith("@openzeppelin/")) {
    const full = path.join(root, "node_modules", importPath);
    return { contents: fs.readFileSync(full, "utf8") };
  }
  return { error: "File not found: " + importPath };
}

function compileFile(solFile, contractName, outName) {
  const source = fs.readFileSync(path.join(root, "contracts", solFile), "utf8");
  const input = {
    language: "Solidity",
    sources: { [solFile]: { content: source } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
    },
  };

  const output = JSON.parse(
    solc.compile(JSON.stringify(input), { import: findImports }),
  );
  if (output.errors?.some((e) => e.severity === "error")) {
    console.error(output.errors.map((e) => e.formattedMessage).join("\n"));
    process.exit(1);
  }

  const contract = output.contracts[solFile][contractName];
  const artifact = {
    abi: contract.abi,
    bytecode: "0x" + contract.evm.bytecode.object,
  };

  const outDir = path.join(root, "src/lib/contracts");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, outName),
    JSON.stringify(artifact, null, 2),
  );
  console.log("Wrote", outName);
}

compileFile("StampOpenNFT.sol", "StampOpenNFT", "StampOpenNFT.json");
compileFile("StampOpenMulti.sol", "StampOpenMulti", "StampOpenMulti.json");
// Legacy
compileFile("SimpleNFT.sol", "SimpleNFT", "SimpleNFT.json");
compileFile("SimpleMultiToken.sol", "SimpleMultiToken", "SimpleMultiToken.json");

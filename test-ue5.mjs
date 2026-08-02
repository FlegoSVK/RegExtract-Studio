const data = {
  "Exports": [
    {
      "$type": "UAssetAPI.ExportTypes.DataTableExport, UAssetAPI",
      "Table": {
        "$type": "UAssetAPI.ExportTypes.UDataTable, UAssetAPI",
        "Data": [
          {
            "$type": "UAssetAPI.PropertyTypes.Structs.StructPropertyData, UAssetAPI",
            "Name": "Hello",
            "Value": [
              {
                "$type": "UAssetAPI.PropertyTypes.Objects.TextPropertyData, UAssetAPI",
                "Name": "en",
                "CultureInvariantString": "Hello"
              }
            ]
          }
        ]
      }
    }
  ]
};

const parsedLines = [];
let lineCounter = 0;
const ue5Config = { targetLang: "en" };

const traverse = (node, path) => {
  if (!node || typeof node !== 'object') return;
  
  if (Array.isArray(node)) {
    node.forEach((child, index) => traverse(child, [...path, index.toString()]));
  } else {
    // Check if this node is a TextPropertyData for the target language
    if (node.$type && typeof node.$type === 'string' && node.$type.includes("TextPropertyData") && node.Name === ue5Config.targetLang) {
      let text = "";
      let textKey = "";
      if (typeof node.CultureInvariantString === 'string') {
        text = node.CultureInvariantString;
        textKey = "CultureInvariantString";
      } else if (typeof node.LocalizedString === 'string') {
        text = node.LocalizedString;
        textKey = "LocalizedString";
      } else if (typeof node.SourceString === 'string') {
        text = node.SourceString;
        textKey = "SourceString";
      }

      if (text) {
        parsedLines.push({
          id: lineCounter++,
          originalContent: text, // Keeping text as original content for the diff UI
          isTranslatable: true,
          prefix: '',
          text: text,
          suffix: '',
          ue5Path: [...path, textKey].join('.')
        });
      }
    }
    // Continue traversal for child properties
    for (const key in node) {
      if (key !== '$type' && key !== 'Name') { // Optimization to avoid unnecessary deep traversal of primitive properties
          traverse(node[key], [...path, key]);
      }
    }
  }
};

traverse(data, []);

console.log(JSON.stringify(parsedLines, null, 2));

const clonedData = JSON.parse(JSON.stringify(data));
for (const line of parsedLines) {
  const parts = line.ue5Path.split('.');
  let current = clonedData;
  for (let i = 0; i < parts.length - 1; i++) {
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = "HELLO TRANSLATED";
}

console.log(JSON.stringify(clonedData, null, 2));

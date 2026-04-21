import { parseFileContent } from './src/services/parser.ts';

const fileContent = `0 TextAsset Base
 1 string m_Name = "Demigods"
 1 string m_Script = "KEY,English,SimplifiedChinese,Russian,Portuguese,BrazilianPortuguese,German\\r\\nDefeat Enemy,Defeat Enemy,击败敌人,Победить враж.,Derrotar Inimigo,Derrotar o Inimigo,Besiege den Gegner\\r\\nCollect Sprites,Collect Sprites,收集魔法精灵,Захватить источники,Recolher Depósitos,Coletar Depósitos,Sammle Manaquellen\\r\\n"
 1 string m_PathName = ""`;

const csvConfig = {
  delimiter: ",",
  quoteChar: "\"",
  targetColumn: 1,
  escapeChar: "\\",
  allowMultiLine: true,
  headerRowIndex: 0,
  isUnityTextAssetFormat: true
};

const regexPattern = "CSV_CONFIG:" + JSON.stringify(csvConfig);

const result = parseFileContent(fileContent, "test.txt", regexPattern);

console.log(JSON.stringify(result, null, 2));

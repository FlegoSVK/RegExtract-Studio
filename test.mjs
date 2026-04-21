const line = ' 1 string m_Script = "KEY,English,SimplifiedChinese,Russian,Portuguese,BrazilianPortuguese,German\\r\\nDefeat Enemy,Defeat Enemy,击败敌人,Победить враж.,Derrotar Inimigo,Derrotar o Inimigo,Besiege den Gegner\\r\\nCollect Sprites,Collect Sprites,收集魔法精灵,Захватить источники,Recolher Depósitos,Coletar Depósitos,Sammle Manaquellen\\r\\n"';
const match = line.match(/^(\s*\d+\s+string\s+[a-zA-Z0-9_]+\s*=\s*")([^"]*)("\s*)$/);

console.log(match ? "Matched!" : "Failed!");
if (match) {
   let giantString = match[2];
   console.log("giant length", giantString.length);
   giantString = giantString.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\\r/g, '\r');
   
   const Papa = await import('papaparse');
   const parsed = Papa.parse(giantString, {
       delimiter: ',',
       quoteChar: '"',
       escapeChar: '\\',
       header: false,
       skipEmptyLines: false
   });
   
   console.log("Parsed rows:", parsed.data.length);
   
   let validParts = 0;
   parsed.data.forEach((row, rowIndex) => {
       const isHeader = (0 !== undefined && 0 >= 0 && rowIndex <= 0); // headerRowIndex = 0
       if (!isHeader && row.length > 1) { // targetColumn = 1
           if (row[1] && row[1].trim().length > 0) validParts++;
       }
   });
   
   console.log("Valid parts:", validParts);
}

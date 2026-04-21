const line = ' 1 string m_Script = "KEY,English,SimplifiedChinese,Russian,Portuguese,BrazilianPortuguese,German\\r\\nDefeat Enemy,Defeat Enemy,击败敌人,Победить враж.,Derrotar Inimigo,Derrotar o Inimigo,Besiege den Gegner\\r\\nCollect Sprites,Collect Sprites,收集魔法精灵,Захватить источники,Recolher Depósitos,Coletar Depósitos,Sammle Manaquellen\\r\\n"';
const matchGreedy = line.match(/^(\s*\d+\s+string\s+[a-zA-Z0-9_]+\s*=\s*")(.*)("\s*)$/);
if(matchGreedy) {
    let giantString = matchGreedy[2];
    giantString = giantString.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\\r/g, '\r');
    
    import('papaparse').then((Papa) => {
        const parsed = Papa.default.parse(giantString, {
            delimiter: ',',
            quoteChar: '"',
            escapeChar: '\\',
            header: false,
            skipEmptyLines: false
        });
        
        const parts = [];
        parsed.data.forEach((row, rowIndex) => {
            const isHeader = (0 !== undefined && 0 >= 0 && rowIndex <= 0); // headerRowIndex = 0
            if (!isHeader && row.length > 1) { // targetColumn = 1
                if (row[1] && row[1].trim().length > 0) parts.push({ isTranslatable: true, text: row[1] });
            }
        });
        
        console.log("Parts: ", JSON.stringify(parts, null, 2));
    });
}

const line = ' 1 string m_Script = "KEY,English,SimplifiedChinese,Russian,Portuguese,BrazilianPortuguese,German\\r\\nDefeat Enemy,Defeat Enemy,击败敌人,Победить враж.,Derrotar Inimigo,Derrotar o Inimigo,Besiege den Gegner\\r\\nCollect Sprites,Collect Sprites,收集魔法精灵,Захватить источники,Recolher Depósitos,Coletar Depósitos,Sammle Manaquellen\\r\\n"';
const matchGreedy = line.match(/^(\s*\d+\s+string\s+[a-zA-Z0-9_]+\s*=\s*")([^"]*)("\s*)$/);
console.log("Did it match?", matchGreedy !== null);

const line = ' 1 string m_Script = "KEY,English\\r\\nOh ""boy"",Wow\\r\\n"';
const matchGreedy = line.match(/^(\s*\d+\s+string\s+[a-zA-Z0-9_]+\s*=\s*")(.*)("\s*)$/);
console.log("Greedy matched?", matchGreedy !== null);

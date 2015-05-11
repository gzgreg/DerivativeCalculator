function isLetter(ch) {
    return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z');
}

function isVar(ch){
	return (ch === 'x') || (ch === 'X')
}
 
function isNumber(ch) {
    return (ch >= '0') && (ch <= '9');
}

function isOpenParen(ch){
	return (ch === '(');
}

function isCloseParen(ch){
	return (ch === ')');
}

function isOp(ch){
	var ops = ['+', '-', '*', '/', '^'];
	return ops.indexOf(ch) != -1;
}

function createToken(value, dValue){
	return {
		value: wrap(value),
		derivative: dValue
	}
}

function createNode(type, value, children){
	return {
		type: type,
		value: value,
		children: children
	}
}

function createRule(condition, action){
	var body = "if(" + condition + "){" + action + "return true;} else return false;";
	return new Function("current", "parent", "children", body);
}

var precedence = {
		"(": -1,
		")": -1,
		"^": 2,
		"*": 1,
		"/": 1,
		"+": 0,
		"-": 0
}

function convertToPostfix(math){
	math = math.replace(/\s/g, "");
	var i = 0;
	var toReturn = [];
	var opStack = [];
	while(math[i] !== undefined){
		var curr = math[i];
		if(isOpenParen(curr)){
			opStack.push(curr);
		} else if(isCloseParen(curr)){
			var op;
			while(!isOpenParen(op = opStack.pop())){
				toReturn.push(op);
				if(opStack.length === 0) throw "Mismatched parentheses";
			}
		} else if(isOp(curr)){
			if(curr === "-" && 
					(i === 0 || isOp(math[i-1]) || isOpenParen(math[i-1]) || (isLetter(math[i-1]) && !isVar(math[i-1])))){
				opStack.push("U-"); //unary negative
			} else {
				if(opStack.length === 0 || isOpenParen(opStack[opStack.length - 1])){
					opStack.push(curr);
				} else {
					var topOp = opStack[opStack.length - 1];
					while(precedence[topOp] === undefined || precedence[topOp] > precedence[curr]){
						toReturn.push(opStack.pop());
						topOp = opStack[opStack.length - 1];
						if(opStack.length === 0) break;
					}
					if(opStack.length === 0 || precedence[topOp] < precedence[curr]){
						opStack.push(curr)
					} else{
						toReturn.push(opStack.pop());
						opStack.push(curr);
					} 
				}
			}
		} else if(isVar(curr)){
			toReturn.push(curr);
		} else if(isNumber(curr)){
			var string = curr;
			i++;
			while(isNumber(math[i]) || math[i] == "."){
				if(isNumber(math[i])){
					string += math[i];
					i++;
				} else {
					if((string.match(/./g) || []).length > 1){
						throw "Invalid number";
					} else {
						string += math[i];
						i++;
					}
				}
			}
			toReturn.push(parseFloat(string));
			i--;
		} else if(isLetter(curr)){ //function
			var string = curr;
			while(isLetter(math[i+1])){
				string += math[i+1];
				i++;
			}
			
			var argIsVar;
			if(isVar(string[string.length - 1])){
				argIsVar = string[string.length - 1];
				string = string.slice(0, -1)
			}
			
			opStack.push(string); //always push since functions are highest precedence
			if(argIsVar !== undefined) toReturn.push(argIsVar);
		} else {
			throw "Illegal character."
		}
		i++;
	}
	
	while(opStack.length > 0){
		var curr = opStack.pop();
		if(isOpenParen(curr)) throw "Mismatched parentheses."
		toReturn.push(curr);
	}
	
	return toReturn;
}

function evaluatePostfix(pf){
	var resultStack = [];
	
	while(pf.length > 0){
		var curr = pf.shift();
		if(typeof(curr) === "number"){
			resultStack.push(createToken(curr, 0)); //derivative of constant is 0
		} else if(isVar(curr)){
			resultStack.push(createToken(curr, 1)); //derivative of x is 1
		} else if(isOp(curr)){
			var last = resultStack.pop();
			var first = resultStack.pop();
			var value = first.value + curr + last.value;
			var deriv;
			switch(curr){
				case "^": 
					deriv = applyPowerRule(first, last);
					break;
				case "*":
					deriv = applyProductRule(first, last);
					break;
				case "/":
					deriv = applyQuotientRule(first, last);
					break;
				case "+":
				case "-":
					deriv = first.derivative + curr + last.derivative;
					break;
			};
			resultStack.push(createToken(value, deriv));
		} else { //function
			var argument = resultStack.pop();
			
			deriv = applyChainRule(curr, argument);
			if(curr === "U-") curr = "-";
			value = curr + wrap(argument.value);
			resultStack.push(createToken(value, deriv));
		}
	}
	
	if(resultStack.length !== 1) throw "Malformed expression.";
	
	return resultStack[0].derivative;
}

function applyPowerRule(base, exp){
	//f(x)^g(x) -> f(x)^(g(x)-1)(f'(x)g(x) + f(x)ln(f(x))g'(x))
	return wrap(base.value) + "^" + wrap(exp.value + "-1") + "*(" + wrap(exp.value) + "*" + wrap(base.derivative) + "+" + wrap(base.value)
			+ "*ln" + wrap(base.value) + "*" + wrap(exp.derivative) + ")";
}

function applyProductRule(f, g){
	//f(x)*g(x) -> f'(x)g(x) + f(x)g'(x)
	return wrap(f.derivative) + "*" + wrap(g.value) + "+" + wrap(f.value) + "*" + wrap(g.derivative);
}

function applyChainRule(func, g){
	//f(g(x)) -> f'(g(x))*g'(x)
	derivatives = {
		sqrt: "1/(2*sqrt(x))",
		ln:  "1/x",
		log: "1/(x*ln(10))",
		sin: "cos(x)",
		cos: "-sin(x)",
		tan: "sec(x)^2",
		sec: "sec(x)*tan(x)",
		csc: "-csc(x)*cot(x)",
		cot: "-csc(x)^2",
		arcsin: "1/sqrt(1-x^2)",
		arccos: "-1/sqrt(1-x^2)",
		arctan: "1/(1+x^2)",
		arccot: "-1/(1+x^2)",
		arcsec: "1/(x*sqrt(x^2-1))",
		arccsc: "-1/(x*sqrt(x^2-1))",
		"U-": "-1" //unary negative
	}
	var term1 = derivatives[func].replace("x", wrap(g.value));
	return term1 + "*" + wrap(g.derivative);	
}

function applyQuotientRule(f, g){
	//f(x)/g(x) -> (f'(x)g(x) - f(x)g'(x))/(g(x)^2)
	return wrap(wrap(f.derivative) + "*" + wrap(g.value) + "-" + wrap(f.value) + "*" + wrap(g.derivative)) + "/" + wrap(wrap(g.value) + "^2")
}

function treeFromPostfix(pf){
	var resultStack = [];
	
	while(pf.length > 0){
		var curr = pf.shift();
		if(typeof(curr) === "number"){
			resultStack.push(createNode("LITERAL", curr, []));
		} else if(isVar(curr)){
			resultStack.push(createNode("VARIABLE", curr, []));
		} else if(isOp(curr)){
			var last = resultStack.pop();
			var first = resultStack.pop();
			var children = [first, last];
			resultStack.push(createNode("OP", curr, children));
		} else { //function
			var argument = resultStack.pop();
			resultStack.push(createNode("FUNC", curr, [argument]));
		}
	}
	
	if(resultStack.length !== 1) throw "Malformed expression.";
	
	return resultStack[0];
}

function simplifyTree(tree){
	var parentStack = [];
	simplifyTree.rules = [createRule("children.every(function(child){return child.type==='LITERAL';}) && current.type === 'OP'",
									"var value = children.reduce(function(prev, curr){switch(current.value){" + 
									"case '+': return prev.value + curr.value;" +
									"case '-': return prev.value - curr.value;" +
									"case '*': return prev.value * curr.value;" +
									"case '/': return prev.value / curr.value;" +
									"case '^': return Math.pow(prev.value, curr.value);" +
									"}}); current.type = 'LITERAL'; current.value = value; current.children = [];"), //literal exp
							createRule("children.some(function(child){return child.type==='LITERAL' && child.value === 0;}) &&" +
									"current.value === '*' && current.type === 'OP'", //multiply by 0
									"current.type = 'LITERAL'; current.value = 0; current.children = [];"),
							createRule("children.some(function(child){return child.type==='LITERAL' && child.value === 0;}) &&" +
									"current.value === '+' && current.type === 'OP'", //add 0
									"children = children.filter(function(child){return child.value !== 0;});" +
									"if(children.length == 1){current.value = children[0].value;" +
									"current.type = children[0].type;" +
									"current.children = children[0].children;}")];  
	function analyzeNode(node){
		if(node.children.length == 0) return;
		parentStack.push(node);
		for(var i = 0; i < node.children.length; i++){
			analyzeNode(node.children[i]);
		}
		parentStack.pop();
		
		for(var i = 0; i < simplifyTree.rules.length; i++){
			var rule = simplifyTree.rules[i];
			rule(node, parentStack[parentStack.length - 1], node.children);
		}
	}
	
	analyzeNode(tree);
	return tree;
}

function calculateDerivative(math){
	return simplifyTree(treeFromPostfix(convertToPostfix(evaluatePostfix(convertToPostfix(math)))));
}

function wrap(x){
	if(typeof(x) === "number" || x.length <= 1) return x;
	return "(" + x + ")";
}
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

function createToken(type, value){
	return {
		type: type,
		value: value
	}
}

function tokenize(math){
	math.replace(/\s/g, "");
}

var precedence = {
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
		} 
		else if(isCloseParen(curr)){
			var op;
			while(!isOpenParen(op = opStack.pop())){
				toReturn.push(op);
				if(opStack.length === 0) throw "Mismatched parentheses";
			}
		}
		else if(isOp(curr)){
			if(opStack.length === 0 || isOpenParen(opStack[opStack.length - 1])){
				opStack.push(curr);
			} 
			else {
				var topOp = opStack[opStack.length - 1];
				while(precedence[topOp] === undefined || precedence[topOp] > precedence[curr]){
					toReturn.push(opStack.pop());
					topOp = opStack[opStack.length - 1];
					if(opStack.length === 0) break;
				}
				if(opStack.length === 0 || precedence[topOp] < precedence[curr]){
					opStack.push(curr)
				}
				else{
					toReturn.push(opStack.pop());
					opStack.push(curr);
				} 
			}
		}
		else if(isVar(curr)){
			toReturn.push(curr);
		}
		else if(isNumber(curr)){
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
		}
		else if(isLetter(curr)){ //function
			var string = curr;
			i++;
			while(isLetter(math[i])){
				string += math[i];
				i++;
			}
			i--;
			
			var argIsVar;
			if(isVar(string[string.length - 1])){
				argIsVar = string[string.length - 1];
				string = string.slice(0, -1)
			}
			
			opStack.push(string); //always push since functions are highest precedence
			if(argIsVar !== undefined) toReturn.push(argIsVar);
		}
		else {
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
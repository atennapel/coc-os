import { runREPL, initREPL } from './repl';

var hist: any[] = [], index = -1;
var input: any = document.getElementById('input');
var content: any = document.getElementById('content');
function onresize() {
	content.style.height = window.innerHeight;
}
window.addEventListener('resize', onresize);
onresize();
addResult("REPL");
// getOutput(':i', addResult);
initREPL();
input.focus();
input.onkeydown = function(keyEvent: any) {
	var val = input.value;
	var txt = (val || '').trim();
	if(keyEvent.keyCode === 13) {
		keyEvent.preventDefault();
		if(txt) {
			hist.push(val);
			index = hist.length;
			input.value = '';
			var div = document.createElement('div');
			div.innerHTML = val;
			div.className = 'line input';
			content.insertBefore(div, input);
			runREPL(txt, addResult);
		}
	} else if(keyEvent.keyCode === 38 && index > 0) {
		keyEvent.preventDefault();
		input.value = hist[--index];
	} else if(keyEvent.keyCode === 40 && index < hist.length-1) {
		keyEvent.preventDefault();
		input.value = hist[++index];
	} else if(keyEvent.keyCode === 40 && keyEvent.ctrlKey && index >= hist.length-1) {
		index = hist.length;
		input.value = '';
	}
}

function addResult(msg: string, err?: boolean): any {
	var divout = document.createElement('pre');
	divout.className = 'line output';
	if(err) divout.className += ' error';
	divout.innerHTML = '' + msg;
	content.insertBefore(divout, input);
	input.focus();
	content.scrollTop = content.scrollHeight;
	return divout;
}

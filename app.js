var ROWS=6,COLS=10,PASSWORD=[1,4,4,1,2,4],currentRow=0,counts=[];
for(var i=0;i<ROWS;i++)counts.push(0);
var grid=document.getElementById('arrowGrid'),msg=document.getElementById('lock-msg');

function renderGrid(){grid.innerHTML='';for(var r=0;r<ROWS;r++){var col=document.createElement('div');col.className='arrow-col'+(r===currentRow?' active':'')+(r<currentRow?' done':'');for(var c=COLS-1;c>=0;c--){var a=document.createElement('span');a.className='arrow'+(c<counts[r]?' filled':'');a.textContent='\u2191';col.appendChild(a)}var num=document.createElement('span');num.className='col-num';num.textContent=r+1;col.appendChild(num);grid.appendChild(col)}}

function resetAll(){for(var i=0;i<ROWS;i++)counts[i]=0;currentRow=0;msg.textContent='';msg.className='';renderGrid()}

function checkPassword(){for(var i=0;i<ROWS;i++)if(counts[i]!==PASSWORD[i])return false;return true}

function tryPassword(nums){
  for(var k=0;k<ROWS;k++)counts[k]=parseInt(nums[k])||0;
  renderGrid();
  if(checkPassword()){
    msg.textContent='ACCESO CONCEDIDO';msg.className='success';
    setTimeout(function(){document.getElementById('lockscreen').classList.add('hidden')},800);
  }else{
    msg.textContent='CLAVE INCORRECTA';msg.className='error';
    setTimeout(resetAll,1200);
  }
}

document.addEventListener('keydown',function(e){
  if(currentRow>=ROWS)return;
  if(e.key==='ArrowUp'){e.preventDefault();if(counts[currentRow]<COLS){counts[currentRow]++;msg.textContent='';msg.className='';renderGrid()}}
  else if(e.key==='ArrowDown'){e.preventDefault();if(counts[currentRow]>0){counts[currentRow]--;msg.textContent='';msg.className='';renderGrid()}}
  else if(e.key==='Escape'){e.preventDefault();if(currentRow>0){currentRow--;renderGrid()}}
  else if(e.key==='Enter'){e.preventDefault();if(currentRow===ROWS-1){if(checkPassword()){msg.textContent='ACCESO CONCEDIDO';msg.className='success';setTimeout(function(){document.getElementById('lockscreen').classList.add('hidden')},800)}else{msg.textContent='CLAVE INCORRECTA';msg.className='error';setTimeout(resetAll,1200)}}else{currentRow++;renderGrid()}}
  else if(e.key==='Backspace'||e.key==='Delete'){e.preventDefault();if(counts[currentRow]>0){counts[currentRow]--;renderGrid()}}
});

renderGrid();

var hint=document.getElementById('lock-hint');
hint.innerHTML='<div id="pwdDisplay" style="color:#ff3333;font-family:Bioweapon,sans-serif;font-size:clamp(18px,3vw,32px);letter-spacing:12px;min-height:clamp(24px,3vw,36px);text-shadow:0 0 10px rgba(255,30,30,0.5)"></div><div style="margin-top:8px;color:#444;font-size:clamp(8px,1.2vw,11px);letter-spacing:2px">ESCRIBE LA CLAVE Y PRESIONA ENTER</div>';
var pwdBuffer='';
document.addEventListener('keydown',function(e){
  if(document.getElementById('lockscreen').classList.contains('hidden'))return;
  if(e.key>='0'&&e.key<='9'&&pwdBuffer.length<6){
    pwdBuffer+=e.key;
    document.getElementById('pwdDisplay').textContent=pwdBuffer.replace(/./g,'\u2022');
  }else if(e.key==='Backspace'){
    pwdBuffer=pwdBuffer.slice(0,-1);
    document.getElementById('pwdDisplay').textContent=pwdBuffer.replace(/./g,'\u2022');
  }else if(e.key==='Enter'&&pwdBuffer.length===6){
    tryPassword(pwdBuffer);
    pwdBuffer='';
    document.getElementById('pwdDisplay').textContent='';
  }
});

var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
if(SR){
  var rec=new SR();
  rec.continuous=true;
  rec.interimResults=true;
  rec.lang='es-ES';
  rec.onresult=function(e){
    for(var i=e.resultIndex;i<e.results.length;i++){
      if(!e.results[i].isFinal)continue;
      var t=e.results[i][0].transcript;
      var clean=t.toLowerCase().replace(/[^a-z0-9\u00e1\u00e9\u00ed\u00f3\u00fa\s]/g,'');
      var w2n={'uno':'1','dos':'2','tres':'3','cuatro':'4','cinco':'5','seis':'6','siete':'7','ocho':'8','nueve':'9','cero':'0','un':'1'};
      var nums='';
      var parts=clean.split(/\s+/);
      for(var j=0;j<parts.length;j++){
        if(w2n[parts[j]]!==undefined)nums+=w2n[parts[j]];
        else if(/^\d$/.test(parts[j]))nums+=parts[j];
      }
      console.log('[MIC]',t,'->',nums);
      if(nums.length>=6)tryPassword(nums);
    }
  };
  rec.onerror=function(e){console.log('[MIC] Error:',e.error)};
  rec.onend=function(){try{rec.start()}catch(x){}};
  rec.start();
}

document.getElementById('desktop').addEventListener('dblclick',function(){document.documentElement.requestFullscreen()});
document.getElementById('desktop').addEventListener('contextmenu',function(e){e.preventDefault()});

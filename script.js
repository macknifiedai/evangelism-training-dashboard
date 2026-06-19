var SHEET_DATA_URL_META = document.querySelector('meta[name="sheet-data-url"]');
var DATA_URL = SHEET_DATA_URL_META ? SHEET_DATA_URL_META.getAttribute('content') : null;
var ROWS = [];

function esc(s){
  var d = document.createElement('div');
  d.textContent = s == null ? '' : String(s);
  return d.innerHTML;
}

function formatTimestamp(ts){
  if(!ts) return '-';
  var d = new Date(ts);
  if(isNaN(d.getTime())) return String(ts);
  var dateOpts = { year:'numeric', month:'short', day:'numeric' };
  var timeOpts = { hour:'numeric', minute:'2-digit', hour12:true };
  return d.toLocaleDateString('en-US', dateOpts) + ', ' + d.toLocaleTimeString('en-US', timeOpts);
}

function isToday(ts){
  if(!ts) return false;
  var d = new Date(ts);
  if(isNaN(d.getTime())) return false;
  var now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function renderStats(){
  var total = ROWS.length;
  var withPhone = ROWS.filter(function(r){ return r.Phone && String(r.Phone).trim(); }).length;
  var today = ROWS.filter(function(r){ return isToday(r.Timestamp); }).length;
  document.getElementById('statTotal').textContent = total;
  document.getElementById('statPhone').textContent = withPhone;
  document.getElementById('statToday').textContent = today;
}

function renderTable(filterText){
  var wrap = document.getElementById('tableWrap');
  var data = ROWS;
  if(filterText){
    var q = filterText.toLowerCase();
    data = ROWS.filter(function(r){
      return (String(r['Full Name']||'').toLowerCase().indexOf(q) >= 0) ||
             (String(r.Email||'').toLowerCase().indexOf(q) >= 0);
    });
  }
  if(!data.length){
    wrap.innerHTML = '<div class="empty-state">No registrations found.</div>';
    return;
  }
  var sorted = data.slice().reverse();
  var rows = sorted.map(function(r){
    return '<tr>' +
      '<td class="muted">' + esc(formatTimestamp(r.Timestamp)) + '</td>' +
      '<td class="name-cell">' + esc(r['Full Name'] || '-') + '</td>' +
      '<td>' + esc(r.Email || '-') + '</td>' +
      '<td>' + esc(r.Phone || '-') + '</td>' +
    '</tr>';
  }).join('');
  wrap.innerHTML =
    '<table><thead><tr>' +
      '<th>Timestamp</th><th>Full Name</th><th>Email</th><th>Phone</th>' +
    '</tr></thead><tbody>' + rows + '</tbody></table>';
}

function loadData(){
  var wrap = document.getElementById('tableWrap');
  wrap.innerHTML = '<div class="loading">Loading registrations…</div>';
  if(!DATA_URL){
    wrap.innerHTML = '<div class="empty-state">Dashboard data source is not connected yet.</div>';
    return;
  }
  fetch(DATA_URL)
    .then(function(res){ return res.json(); })
    .then(function(json){
      var raw = json.rows || json.data || json.values || json || [];
      if(Array.isArray(raw) && raw.length && Array.isArray(raw[0])){
        var headers = raw[0];
        ROWS = raw.slice(1).map(function(r){
          var o = {};
          headers.forEach(function(h, i){ o[h] = r[i]; });
          return o;
        });
      } else if(Array.isArray(raw)){
        ROWS = raw;
      } else {
        ROWS = [];
      }
      ROWS = ROWS.filter(function(r){ return r && (r['Full Name'] || r.Email); });
      renderStats();
      renderTable(document.getElementById('searchBox').value);
    })
    .catch(function(){
      wrap.innerHTML = '<div class="empty-state">Could not load registrations right now. Try refreshing.</div>';
    });
}

document.getElementById('searchBox').addEventListener('input', function(){
  renderTable(this.value);
});
document.getElementById('refreshBtn').addEventListener('click', loadData);
document.getElementById('csvBtn').addEventListener('click', function(){
  if(!ROWS.length){ alert('No data to export yet.'); return; }
  var lines = ['Timestamp,Full Name,Email,Phone'];
  ROWS.forEach(function(r){
    var vals = [formatTimestamp(r.Timestamp), r['Full Name'], r.Email, r.Phone].map(function(v){
      return '"' + String(v || '').replace(/"/g,'""') + '"';
    });
    lines.push(vals.join(','));
  });
  var blob = new Blob([lines.join('\n')], {type:'text/csv'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'evangelism_training_registrations.csv';
  a.click();
});

loadData();
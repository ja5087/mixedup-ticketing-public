function deleteTicket(cell) {
    var row = document.getElementById("row_" + cell.getAttribute('data-rowID'));
    console.log(row);

    var confirmationCode = row.cells[2].innerHTML;
    var req = new XMLHttpRequest();
    req.open('POST', '/delete', true);
    req.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');


    req.addEventListener("load", transferComplete);

    function transferComplete(e) {
        if (req.status == 500) {
            document.getElementById("flashbar").innerHTML = req.statusText;
        } else {
            location.reload(true);
        }
    }

    req.send(JSON.stringify({ 'confirmationCode': confirmationCode }));




}
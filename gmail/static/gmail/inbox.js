document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('button').forEach(button => {
        button.onclick = function(){
            const page = this.dataset.page
            if (page === "compose"){
                history.pushState({}, "", `${page}`)
                compose_email()
            } else {
                history.pushState({mailbox: page}, "", `${page}`)
                load_mailbox(page)
            }
            
        }
    })
    // document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
    // document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
    // document.querySelector('#archive').addEventListener('click', () => load_mailbox('archive'));
    // document.querySelector('#compose').addEventListener('click', compose_email);

    document.querySelector("#compose-form").addEventListener('submit', send_email)

    load_mailbox('inbox');
})



function compose_email(){

    document.querySelector('#emails-view').style.display = 'none';
    document.querySelector('#compose-view').style.display = 'block';
    document.querySelector('#email-detail-view').style.display = 'none';

    document.querySelector('#compose-recipients').value = '';
    document.querySelector('#compose-subject').value = '';
    document.querySelector('#compose-body').value = '';
}




function load_mailbox(mailbox){

    document.querySelector('#emails-view').style.display = 'block';
    document.querySelector('#compose-view').style.display = 'none';
    document.querySelector('#email-detail-view').style.display = 'none';

    document.querySelector('#emails-view').innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;

    fetch(`emails/${mailbox}`)
    .then(response => response.json())
    .then(emails => {
        // console.log(emails)
        emails.forEach(singleEmail => {
            // console.log(singleEmail)
            const newEmail = document.createElement('div');
            newEmail.className = "list-group-item";
            newEmail.innerHTML = `
                <h5> Sender: ${singleEmail.sender}</h5>
                <h5> Subject: ${singleEmail.subject}</h5>
                <p> ${singleEmail.timestamp}</p>
            `
            newEmail.className = singleEmail.read ? 'read':'unread';
            newEmail.addEventListener('click', function(){
                view_email(singleEmail.id)
            });
        document.querySelector('#emails-view').append(newEmail)

        

        });



            // const newEmail = document.createElement('div');
            // newEmail.className = "list-group-item"
            // newEmail.innerHTML = `
            //     <h5> Sender: ${singleEmail.sender}</h5>
            //     <h5> Subject: ${singleEmail.subject}</h5>
            //     <p> ${singleEmail.timestamp}</p>
            // `;

            // newEmail.className = singleEmail
        });
    // })
}

function send_email(){
    event.preventDefault();
    const recipients = document.querySelector('#compose-recipients').value;
    const subject = document.querySelector('#compose-subject').value;
    const body = document.querySelector('#compose-body').value;

    fetch('/emails', {
        method: 'POST',
        body: JSON.stringify({
            recipients: recipients,
            subject:subject,
            body:body,
        })
    })
    .then(response => response.json())
    .then(result => {
        console.log(result)
        load_mailbox('sent')
    })
    
}

function view_email(id){
    fetch(`emails/${id}`)
    .then(response => response.json())
    .then(email => {
        document.querySelector('#emails-view').style.display = "none";
        document.querySelector('#compose-view').style.display = "none";
        document.querySelector('#email-detail-view').style.display = "block"

        document.querySelector('#email-detail-view').innerHTML = `
            <ul class="list-group">
                <li class="list-group-item"><strong> From: </strong> ${email.sender}</li>
                <li class="list-group-item"><strong> To: </strong> ${email.recipients}</li>
                <li class="list-group-item"><strong> Subject: </strong> ${email.subject}</li>
                <li class="list-group-item"> Timestamp: ${email.timestamp}</li>
                <li class="list-group-item"> ${email.body}</li>
            </ul>   
        `;

        if (!email.read){
            fetch(`/emails/${email.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    read:true
                })
            })
        }
    
        const button = document.createElement('button');
        button.innerHTML = email.archived ? "Unarchive":"Archive";
        button.className = email.archived ? "btn btn-success":"btn btn-danger";
        button.addEventListener('click', function(){
            fetch(`emails/${email.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    archived:!email.archived
                })
            })
            .then(load_mailbox('archive'))
        })
        document.querySelector("#email-detail-view").append(button)

        const replyButton = document.createElement('button');
        replyButton.innerHTML = "Reply";
        replyButton.className = "btn btn-info";
        replyButton.addEventListener('click', function(){
            compose_email();
            document.querySelector('#compose-recipients').value = email.sender;
            let subject = email.subject
            if (subject.split('', 1)[0] != "Re: "){
                subject = "Re: " + email.subject
            }
            document.querySelector('#compose-subject').value = subject;
            document.querySelector('#compose-body').value = `On ${email.timestamp} ${email.sender} wrote ${email.body}`;
        })
        document.querySelector("#email-detail-view").append(replyButton);
        
    })
}
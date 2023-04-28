from django.shortcuts import render
from django.contrib.auth import authenticate, login, logout
from django.shortcuts import HttpResponse, HttpResponseRedirect, render
from django.urls import reverse
from .models import User, Email
from django.db import IntegrityError
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
import json

# Create your views here.

def index(request):
    if request.user.is_authenticated:
        return render(request, "gmail/inbox.html")
    return HttpResponseRedirect(reverse("login"))


@csrf_exempt
@login_required
def compose(request):
    if request.method != "POST":
        return JsonResponse({"error":"POST request required."}, status=400)
    
    data = json.loads(request.body)
    emails = [email.strip() for email in data.get("recipients").split(",")]
    if emails == [""]:
        return JsonResponse({
            "error": "At least one recipient reuired."
        }, status = 400)
    
    recipients = []
    for email in emails:
        try:
            user = User.objects.get(email=email)
            recipients.append(user)
        except User.DoesNotExist:
            return JsonResponse({
                "error":f"User with email {email} does not exist."
            }, status=400)
    
    subject = data.get("subject", "")
    body = data.get("body", "")

    users = set()
    users.add(request.user)
    users.update(recipients)
    for user in users:
        email = Email(
            user=user,
            sender=request.user,
            subject=subject,
            body=body,
            read=user==request.user
        )
        email.save()
        for recipient in recipients:
            email.recipients.add(recipient)
        email.save()
    return JsonResponse({"message":"Email sent successfully."}, status=201)


@login_required
def mailbox(request, mailbox):
    if mailbox == "inbox":
        emails = Email.objects.filter(
            user=request.user, recipients=request.user, archived=False
        )
    elif mailbox == "sent":
        emails = Email.objects.filter(
            user=request.user, sender=request.user
        )   
    elif mailbox == "archive":
        emails = Email.objects.filter(
            user=request.user, recipients=request.user, archived=True
        )
    else:
        return JsonResponse({"error":"Invalid mailbox."}, statis=400)
    
    #Return emails in reverse chronological order
    emails = emails.order_by("-timestamp").all()
    return JsonResponse([email.serialize() for email in emails], safe=False)
     



@csrf_exempt
@login_required
def email(request, email_id):

    try:
        email = Email.objects.get(user=request.user, pk=email_id)
    except Email.DoesNotExist:
        return JsonResponse({"error":"Email not found"}, status=400)
    
    if request.method == "GET":
        return JsonResponse(email.serialize())
    

    elif request.method == "PUT":
        data = json.loads(request.body)
        if data.get("read") is not None:
            email.read = data["read"]
        if data.get("archived") is not None:
            email.archived = data["archived"]
        email.save()
        return HttpResponse(status=204)

    else:
        return JsonResponse({
            "error": "Get or PUT request required"
        }, status=400)

def login_view(request):
    if request.method == "POST":
        email = request.POST['email']
        password = request.POST['password']
        user = authenticate(request, username=email, password=password )

        if user is not None:
            login(request, user)
            return HttpResponseRedirect(reverse("index"))
        else:
            return render(request, "gmail/login.html", {
                "message":"Invalid email/password"
            })
    else:
        return render(request, "gmail/login.html")

def register(request):
    if request.method == "POST":
        email = request.POST['email']
        password = request.POST['password']
        confirm_password = request.POST['confirm_password']
        if password != confirm_password:
            return render(request, "gmail/register.html", {
                "message": "Password doesn't match, please try again"
            })
        try:
            user = User.objects.create_user(email, email, password)
            user.save()
        except IntegrityError as e:
            print(e)
            return render(request, "gmail/register.html", {
                "message":"Email address already taken"
            })
        login(request, user)
        return HttpResponseRedirect(reverse("index"))
    else:
        return render(request, "gmail/register.html")
    
def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse("index"))
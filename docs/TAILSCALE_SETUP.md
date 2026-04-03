# Use Even Messages away from home with Tailscale

This guide explains how to keep using **Even Messages** when you are **not on your home Wi-Fi**.

---

## The short version

Normally, Even Messages talks to **Beeper Desktop** on your home computer using your local home network.

When you leave home, that connection stops working.

**Tailscale** fixes this by creating a private connection between:

- your **home computer** (the one running Beeper Desktop)
- your **phone** (the one running the Even app / Even Messages)

Once both devices are connected to Tailscale, Even Messages can reach your home computer even when you are outside.

---

## What is Tailscale?

Tailscale is an app that puts your devices on the same private network, even when they are in different places.

In simple words:

- your computer stays at home
- your phone can be anywhere
- Tailscale makes them talk to each other securely

Good news:

- you do **not** need to change your router
- you do **not** need to open ports
- for personal use, the free Tailscale plan is usually enough

---

## What you need before starting

You will need:

1. The **computer at home** that runs **Beeper Desktop**
2. Your **phone** that runs the **Even app / Even Messages**
3. A **Tailscale account**
4. Your **Beeper API token**
5. A few minutes for the first setup

> Important: You do **not** need to install Tailscale on the glasses themselves. The important device is the **phone** running the Even app.

---

## What you will do

You only need to set this up once:

1. Install Tailscale on your home computer
2. Install Tailscale on your phone
3. Sign in to the **same Tailscale account** on both devices
4. Find the Tailscale address of your home computer
5. Put that address into Even Messages

After that, using the app away from home is much easier.

---

## Part 1 - Install Tailscale on your home computer

This is the computer where **Beeper Desktop** is installed and stays running.

### Step 1: Download Tailscale

Go to:

- https://tailscale.com/download

Install Tailscale on your home computer.

### Step 2: Open Tailscale and sign in

After installation:

1. Open **Tailscale**
2. Sign in
3. Use the account you want to keep for this setup

### Step 3: Make sure Tailscale shows as connected

When it is working, Tailscale should show that your device is connected.

Leave Tailscale installed and signed in on this computer.

### Step 4: Keep this computer available

For Even Messages to work when you are away:

- the computer must be **turned on**
- Tailscale must be **connected**
- **Beeper Desktop** must be **open and running**

If the computer is asleep, shut down, or disconnected from the internet, the app will not be able to connect.

---

## Part 2 - Install Tailscale on your phone

This is the phone that runs the **Even app / Even Messages**.

### Step 1: Install Tailscale

Install **Tailscale** from:

- iPhone/iPad: App Store
- Android: Google Play Store

### Step 2: Sign in to the same account

Open Tailscale on your phone and sign in with the **same Tailscale account** you used on the home computer.

This is very important.

If the accounts are different, the devices usually will not see each other.

### Step 3: Turn Tailscale on

The phone may ask for permission to create a VPN connection.

Please accept it.

That is normal. Tailscale needs this to create the secure connection.

When Tailscale is on, your phone should show as connected.

---

## Part 3 - Find your home computer's Tailscale address

You now need the private address of the home computer.

In Tailscale, this is usually an address that looks like this:

`100.x.x.x`

Example:

`100.101.102.103`

### How to find it

Open Tailscale on your home computer and look for the device details.
You should see either:

- a Tailscale IP address starting with `100.`
- or a device name listed in Tailscale

For this guide, the easiest option is to use the **Tailscale IP address**.

Write it down or copy it.

---

## Part 4 - Make sure Beeper Desktop is ready

On your home computer:

1. Open **Beeper Desktop**
2. Make sure you are signed in
3. Make sure **Developer Mode** is enabled
4. Copy your **API token** from Beeper settings

If you already use Even Messages at home, you may already have this token.

Keep Beeper Desktop running.

---

## Part 5 - Configure Even Messages

Now open **Even Messages** and go to the app settings.

You will enter two things:

### API Base URL

Use this format:

`http://YOUR_TAILSCALE_IP:23373`

Example:

`http://100.101.102.103:23373`

### API Token

Paste your Beeper API token.

Then save the settings.

---

## Very important: do not use localhost when you are away from home

You may have seen this before:

`http://localhost:23373`

This only works when the app is talking to the same device locally.

When you are outside your home, you should use:

`http://YOUR_TAILSCALE_IP:23373`

Example:

`http://100.101.102.103:23373`

If you still use `localhost`, Even Messages will try to find Beeper on the phone itself, not on your home computer.

---

## What to do every time you are outside

Before opening Even Messages, quickly check these 5 things:

1. Your **home computer is on**
2. **Beeper Desktop** is open on that computer
3. **Tailscale is connected** on the home computer
4. **Tailscale is connected** on your phone
5. Your phone has internet access (Wi-Fi or mobile data)

If all 5 are true, the app should be able to connect.

---

## Simple test to confirm everything works

A good idea is to test this once before you really need it.

### Easy test

1. Set everything up while at home
2. Turn **off your phone's Wi-Fi**
3. Leave **mobile data** on
4. Make sure **Tailscale stays connected** on the phone
5. Open Even Messages and try to connect

If it works on mobile data, it should also work when you are away from home.

---

## Troubleshooting

If it does not work, check the items below.

### Problem: Even Messages cannot connect

Check:

- Is the home computer turned on?
- Is **Beeper Desktop** still open?
- Is **Tailscale** connected on both devices?
- Did you paste the correct **API token**?
- Did you use the correct **Tailscale IP**?
- Did you include `:23373` at the end?

Correct example:

`http://100.101.102.103:23373`

---

### Problem: You used `localhost`

This is a very common mistake.

Wrong when away from home:

`http://localhost:23373`

Right when away from home:

`http://100.101.102.103:23373`

---

### Problem: The home computer is asleep

If the computer is sleeping, Even Messages cannot reach it.

You may need to change your computer settings so it does not go to sleep too aggressively.
At minimum, make sure it stays on when you want remote access.

---

### Problem: Tailscale is installed but disconnected

Open Tailscale on both devices and make sure it says it is connected.

On phones, Tailscale can sometimes be turned off without you noticing.
Always check it before using the app outside.

---

### Problem: Public Wi-Fi is acting strangely

Some public or work Wi-Fi networks can interfere with VPN-style apps.

If things are not working on public Wi-Fi, try:

- turning Wi-Fi off on the phone
- using mobile data instead

---

### Problem: The API token does not work

If Even Messages still cannot connect, try getting a fresh API token from **Beeper Desktop** and pasting it again.

---

## Optional: use Tailscale all the time

You can also use the Tailscale address even when you are at home.

That means you can keep the same API Base URL everywhere:

`http://YOUR_TAILSCALE_IP:23373`

This can be simpler because you do not need to change settings when you leave home.

---

## Security note

Tailscale is a safer option than exposing your home computer directly to the internet.

That said:

- only sign in on devices you trust
- keep your phone locked with a passcode
- do not share your Beeper API token with other people

---

## Quick copy/paste example

Replace the example IP below with your own Tailscale IP:

- **API Base URL:** `http://100.101.102.103:23373`
- **API Token:** your Beeper token

---

## Final checklist

If you want the simplest possible checklist, use this:

- [ ] Tailscale installed on the home computer
- [ ] Tailscale installed on the phone
- [ ] Same Tailscale account on both devices
- [ ] Home computer is on
- [ ] Beeper Desktop is open
- [ ] Tailscale connected on both devices
- [ ] Even Messages API Base URL uses the Tailscale IP
- [ ] API token pasted correctly

Once this is done, you should be able to use Even Messages even when you are away from home.

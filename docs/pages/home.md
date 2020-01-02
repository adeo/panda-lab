---
layout: default
title: Home
nav_order: 1
permalink: /
---

# Panda Lab
{: .fs-9 }

PandaLab is an open source solution which helps you to manager fleet of devices and to run automatic tests on them.
{: .fs-6 .fw-300 }

[Get started now](configure){: .btn .btn-primary .fs-5 .mb-4 .mb-md-0 .mr-2 } [View it on GitHub](https://github.com/adeo/panda-lab){: .btn .fs-5 .mb-4 .mb-md-0 }

---

## About

A lot of powerful testing solutions exist out there. 
In most of the case, these solutions allow you to test quite efficiently your app but you also need to do some concession.

PandaLab was started in order to solve some of the limitations we had with cloud solutions. 
For us, it was important to be able to test on specific hardware. 
We also needed our devices to be on private networks to access test environments.
And finally, we didn't wanted to worry about pricing or restriction on the amount of tests we could run, to allow us an easier CI integration.

These are all the issues that PandaLab is trying to solve. This solution is fully open source and is just waiting for you to help it grow.

---

## Features

### Decentralized agent
You can have multiple device labs in your teams and share all the available devices, no matter where they are connected.

![](assets/screenshots/devices.png)

### Jobs queue
PandaLab deals with concurrent jobs on a pool of devices.

![](assets/screenshots/jobs.png)

### Test report
PandaLab provides simple but efficient test reports and charts.
![](assets/screenshots/apps.png)
![](assets/screenshots/chart.png)


### Android instrumentation test support
For now, PandaLab only supports android instrumentation test (Espresso/UI Automator) but we are looking to add Appium test support.
![](assets/screenshots/report.png)


### Manage devices
The lab agents take care of your devices and deal with device status (available, enrolled, booked, remote connection ...).
![](assets/screenshots/agent.png)

### And more soon
[Access roadmap](roadmap){: .btn .btn-primary .fs-5 .mb-4 .mb-md-0 .mr-2 } 

---


## Partners

<img src="assets/partners/leroy-merlin-logo.png" alt="drawing" width="200"/>
<img src="assets/partners/ineat-logo.png" alt="drawing" width="200"/>


---

## License

PandaLab is distributed by an [Apache License, Version 2.0](http://www.apache.org/licenses/LICENSE-2.0).

## Contributing

When contributing to this repository, please first discuss the change you wish to make via issue,
email, or any other method with the owners of this repository before making a change.
Read more about becoming a contributor in [this guide](https://www.contributor-covenant.org/).

### Thank you to the contributors PandaLab

<ul class="list-style-none">
{% for contributor in site.github.contributors %}
  <li class="d-inline-block mr-1">
     <a href="{{ contributor.html_url }}"><img src="{{ contributor.avatar_url }}" width="32" height="32" alt="{{ contributor.login }}"/></a>
  </li>
{% endfor %}
</ul>

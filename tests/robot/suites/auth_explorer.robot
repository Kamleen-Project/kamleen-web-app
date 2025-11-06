*** Settings ***
Resource          ../resources/Common.resource
Suite Setup       Common Suite Setup
Suite Teardown    Common Suite Teardown
Test Setup        Common Test Setup
Test Teardown     Common Test Teardown


*** Test Cases ***
Explorer can login via credentials and reach dashboard
    Go To Path    /login
    # Use quick-fill buttons exposed in the login form
    Click    xpath=//button[normalize-space(.)='Explorer']
    Click    xpath=//button[normalize-space(.)='Sign in']
    # After successful login we should land on /dashboard and see welcome text
    Wait For Text    Welcome back



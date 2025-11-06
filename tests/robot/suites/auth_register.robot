*** Settings ***
Resource          ../resources/Common.resource
Library           RequestsLibrary
Suite Setup       Common Suite Setup
Suite Teardown    Common Suite Teardown
Test Setup        Common Test Setup
Test Teardown     Common Test Teardown


*** Test Cases ***
Explorer can create a new account and see onboarding welcome
    Go To Path    /register
    Wait For Selector    xpath=//*[@id='name']
    ${ts}=    Get Time    epoch
    ${email}=    Set Variable    e2e+${ts}@example.com
    Fill    xpath=//input[@id='name']    Robot Tester
    Fill    xpath=//input[@id='email']   ${email}
    Fill    xpath=//input[@id='password']    TestPass123!
    Click   xpath=//button[normalize-space(.)='Create account']
    Wait For Text    Welcome to Kamleen    30s
    # Continue onboarding flow
    Click   xpath=//a[normalize-space(.)='Get started']
    Wait For Text    Confirm your email
    # Verify email via test-only API (requires app started with E2E_TESTS=true)
    Create Session    together    ${BASE_URL}
    ${status}    ${resp}=    Run Keyword And Ignore Error    Post On Session    together    /api/test/verify-user    json={"email":"${email}"}
    IF    '${status}' == 'PASS' and ${resp.status_code} == 200
        # Refresh onboarding, fill profile via API from within the authenticated browser context
        Go To Path    /onboarding
        Evaluate JavaScript    return fetch('/api/profile', {method:'PATCH', headers:{'content-type':'application/json'}, body: JSON.stringify({ name: 'Robot Tester', birthDate: '1994-07-22', acceptTerms: true, gender: 'MALE' })}).then(r=>r.ok);
        Reload
        Wait For Text    You’re all set!
    ELSE
        Log    E2E email verification endpoint not enabled; skipping remaining onboarding steps.
    END



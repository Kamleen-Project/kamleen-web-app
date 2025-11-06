*** Settings ***
Resource          ../resources/Common.resource
Suite Setup       Common Suite Setup
Suite Teardown    Common Suite Teardown
Test Setup        Common Test Setup
Test Teardown     Common Test Teardown


*** Test Cases ***
Home page loads and shows search
    Go To    ${BASE_URL}
    Wait For Selector    xpath=//*[@id='exp-search-q']

Experiences page loads and shows heading
    Go To Path    /experiences
    Wait For Selector    xpath=//*[@id='exp-search-q']
    Wait For Text    Explore experiences



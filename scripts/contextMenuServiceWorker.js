// Function to get + decode API key
const getKey = () => {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['openai-key'], (result) => {
            if (result['openai-key']) {
                const decodedKey = atob(result['openai-key']);
                resolve(decodedKey);
            }
        });
    });
};

const sendMessage = (content) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0].id;

        chrome.tabs.sendMessage(
            activeTab,
            { message: 'inject', content },
            (response) => {
                if (response.status === 'failed') {
                    console.log('injection failed.');
                }
            }
        );
    });
};

const generate = async (prompt) => {
    // Get API key from storage
    const key = await getKey();
    const url = 'https://api.openai.com/v1/completions';

    // Call completions endpoint
    const completionResponse = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
            model: 'text-davinci-003',
            prompt: prompt,
            max_tokens: 1250,
            temperature: 0.7,
        }),
    });

    // Select the top choice and send back
    const completion = await completionResponse.json();
    return completion.choices.pop();
}

const generateCompletionAction = async (info) => {
    try {
        // Send message with generating text (loading indicator)
        sendMessage('generating...');

        const { selectionText } = info;
        const basePromptPrefix = `
        This is a chat with Michael Scott, a character in the US comedy show The Office
        where he is the manager at a paper company called Dunder Miflin. It is his birthday today and he is really 
        happy that someone special is visiting him.
        
        Me:
        `;
        // Call GPT-3
        const baseCompletion = await generate(
            `${basePromptPrefix}${selectionText}`
        );
        
        // Run second prompt here
        const secondPrompt = 
        `
        This is a chat with Michael Scott, a character from the office who plays the manager
        of a paper company Dunder Miflin.

        Michael answers to ${selectionText} with ${baseCompletion.text}

        He then repeats his reply and elaborates on why he gave that response by making a paper reference.

        Michael:
        `;

        // Call second prompt
        const secondPromptCompletion = await generate(secondPrompt);        

        // Send output when all done
        sendMessage(secondPromptCompletion.text);

    } catch (error) {
        console.log(error);
        
        // Send error output
        sendMessage(error.toString());
    }
};

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: 'context-run',
      title: 'michael scott bot',
      contexts: ['selection'],
    });
  });
  
  // Add listener
  chrome.contextMenus.onClicked.addListener(generateCompletionAction);
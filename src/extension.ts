import * as vscode from "vscode";
import ollama from "ollama";
import markdownit from "markdown-it";
import hljs from "highlight.js";

export function activate(context: vscode.ExtensionContext) {
  console.log("vscode-chat is now alive!");

  const disposable = vscode.commands.registerCommand(
    "vscode-chat.start",
    () => {
      const panel = vscode.window.createWebviewPanel(
        "deepChat",
        "Deep Seek Chat",
        vscode.ViewColumn.One,
        {
          enableScripts: true,
        }
      );

      panel.webview.html = getWebviewContent();

      const md: markdownit = markdownit({
        highlight: function (str, lang) {
          if (lang && hljs.getLanguage(lang)) {
            try {
              return (
                '<pre><code class="hljs">' +
                hljs.highlight(str, { language: lang, ignoreIllegals: true })
                  .value +
                "</code></pre>"
              );
            } catch (__) {}
          }

          return (
            '<pre><code class="hljs">' +
            md.utils.escapeHtml(str) +
            "</code></pre>"
          );
        },
      });

      panel.webview.onDidReceiveMessage(
        async (message: any) => {
          switch (message.command) {
            case "chat":
              console.log("onDidReceiveMessage", message.text);
              const userPrompt = message.text;
              let responseText = "";
              try {
                const streamResponse = await ollama.chat({
                  model: "mistral-small",
                  messages: [{ role: "user", content: userPrompt }],
                  stream: true,
                });

                for await (const part of streamResponse) {
                  responseText += part.message.content;
                  panel.webview.postMessage({
                    command: "chatResponse",
                    text: md.render(responseText),
                  });
                }
                panel.webview.postMessage({
                  command: "chatFinished",
                });
              } catch (error: any) {
                panel.webview.postMessage({
                  command: "chatResponse",
                  text: `Error: ${String(error.message)}`,
                });
                console.error(error);
              }

              break;
          }
        },
        undefined,
        context.subscriptions
      );
    }
  );

  context.subscriptions.push(disposable);
}

function getWebviewContent(): string {
  return /*html*/ `<!DOCTYPE html>
		<html lang="en">
		<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>Deep Seek Chat</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/default.min.css">

		<style>
			body {
				font-family: Arial, sans-serif;	
				margin: 1rem;
			}

			#prompt {
				width: 100%;
 				border-radius: 6px;
        padding: 0.5rem;
				box-sizing: border-box;
			}
			
			#response {
				border: 1px solid #ccc;
				margin-top: 1rem;
				padding: 1rem;
				min-height: 200px;
				border-radius: 6px;
			}

      #askBtn, #clearBtn {
        margin-top: 1rem;
        padding: 0.5rem 1rem;
        border: none;
        background-color: #007acc;
        color: white;
        border-radius: 6px;
        cursor: pointer;
      }

      div.code {
        white-space: pre;
      }
		</style>
		</head>
		<body>
		<h2>Deep Seek Chat</h2>
		<textarea id="prompt" rows="3" placeholder="Type your prompt here"></textarea><br />
		<button id="askBtn" class="vscode-chat-extn">Ask</button>
		<button id="clearBtn" class="vscode-chat-extn">Clear</button>
		<div id="response"></div>

		<script>
			const vscode = acquireVsCodeApi();

			document.getElementById('askBtn').addEventListener('click', () => {
				const text = document.getElementById('prompt').value;
        document.body.style.cursor = 'wait';
				vscode.postMessage({
					command: 'chat', text
				});
			});

      document.getElementById('clearBtn').addEventListener('click', () => {
				document.getElementById('response').innerHTML = "";
			});

			window.addEventListener('message', event => {
				const { command, text } = event.data;
				if (command === 'chatResponse') {
					document.getElementById('response').innerHTML = text;
				}
        else if (command === 'chatFinished') {
          document.body.style.cursor = 'default';
        }
			});

		</script>

		</body>
		</html>
	`;
}

// This method is called when your extension is deactivated
export function deactivate() {}

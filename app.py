from flask import Flask, render_template, jsonify, request, session
from src.helper import download_hugging_face_embeddings
from langchain_pinecone import Pinecone
from langchain_ollama import ChatOllama
from langchain_core.runnables import RunnablePassthrough, RunnableParallel
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from dotenv import load_dotenv
from src.prompt import *
import os
import base64

# Try to import additional LLM providers
try:
    from langchain_openai import ChatOpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

try:
    from langchain_google_genai import ChatGoogleGenerativeAI
    GOOGLE_AVAILABLE = True
except ImportError:
    GOOGLE_AVAILABLE = False

try:
    from langchain_anthropic import ChatAnthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False

app = Flask(__name__)
app.secret_key = 'elarova_secret_key'

load_dotenv()

PINECONE_API_KEY = os.environ.get('PINECONE_API_KEY')
PINECONE_CLOUD = "aws"
PINECONE_REGION = "us-east-1"

if not PINECONE_API_KEY:
    print("Error: PINECONE_API_KEY not found in environment variables. Please set it in a .env file.")
    exit(1)

os.environ["PINECONE_API_KEY"] = PINECONE_API_KEY
os.environ["PINECONE_CLOUD"] = PINECONE_CLOUD
os.environ["PINECONE_REGION"] = PINECONE_REGION

embeddings = download_hugging_face_embeddings()

index_name = "elarova"

docsearch = Pinecone.from_existing_index(
    index_name=index_name,
    embedding=embeddings
)

retriever = docsearch.as_retriever(search_type="similarity", search_kwargs={"k": 3})

llm = ChatOllama(model="llama3.2:1b", temperature=0.4)

system_prompt = system_prompt

rag_chain = (
    RunnablePassthrough.assign(context=(lambda x: retriever.invoke(x["input"])))
    | RunnableParallel(
        {
            "context": (lambda x: x["context"]),
            "answer": (
                ChatPromptTemplate.from_messages(
                    [
                        ("system", system_prompt),
                        ("human", "{input}"),
                    ]
                )
                | llm
                | StrOutputParser()
            ),
        }
    )
).with_config(run_name="RagChain")


def get_llm(model_name):
    """Factory function to get LLM based on model selection"""
    if model_name == "ollama":
        return ChatOllama(model="llama3.2:1b", temperature=0.7)
    elif model_name == "gpt":
        if not OPENAI_AVAILABLE:
            raise Exception("langchain-openai not installed. Run: pip install langchain-openai")
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise Exception("OPENAI_API_KEY not set in .env file")
        return ChatOpenAI(model="gpt-4", api_key=api_key, temperature=0.7)
    elif model_name == "gemini":
        if not GOOGLE_AVAILABLE:
            raise Exception("langchain-google-genai not installed. Run: pip install langchain-google-genai")
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise Exception("GEMINI_API_KEY not set in .env file")
        return ChatGoogleGenerativeAI(model="models/gemini-1.5-flash", google_api_key=api_key, temperature=0.7)
    elif model_name == "claude":
        if not ANTHROPIC_AVAILABLE:
            raise Exception("langchain-anthropic not installed. Run: pip install langchain-anthropic")
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            raise Exception("ANTHROPIC_API_KEY not set in .env file")
        return ChatAnthropic(model="claude-3-opus-20240229", anthropic_api_key=api_key, temperature=0.7)
    else:
        return ChatOllama(model="llama3.2:1b", temperature=0.7)


@app.route("/ai-chat", methods=["POST"])
def ai_chat():
    """Handle AI Helper widget chat requests"""
    try:
        message = request.form.get("message", "").strip()
        model = request.form.get("model", "ollama")
        
        if not message:
            return jsonify({"error": "Please enter a message"}), 400
        
        # Handle image if uploaded
        image_file = request.files.get("image")
        image_data = None
        if image_file:
            image_data = base64.b64encode(image_file.read()).decode('utf-8')
        
        # Get the selected LLM
        llm = get_llm(model)
        
        # Build the prompt
        if image_data:
            prompt = f"""User sent an image and asked: {message}

Please analyze the image and answer the question based on what you see."""
        else:
            prompt = message
        
        # Get response from LLM
        try:
            response = llm.invoke(prompt)
        except Exception as e:
            error_msg = str(e)
            if "image" in error_msg.lower() or "clipboard" in error_msg.lower():
                return jsonify({"error": "This model does not support image input. Please use text only or switch to a vision-capable model."}), 400
            raise
        answer = ""
        if hasattr(response, 'content'):
            answer = str(response.content)
        elif isinstance(response, str):
            answer = response
        else:
            answer = str(response)
        
        # Ensure answer is a string
        if not isinstance(answer, str):
            answer = str(answer)
        
        # Format the answer
        formatted_answer = answer.replace("**", "<strong>").replace("**", "</strong>")
        formatted_answer = formatted_answer.strip()
        formatted_answer = formatted_answer.replace("\n\n", "<br><br>")
        formatted_answer = formatted_answer.replace("\n", "<br>")
        
        return formatted_answer
        
    except Exception as e:
        print(f"AI Chat Error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/")
def index():
    return render_template('chat.html')


@app.route("/get", methods=["GET", "POST"])
def chat():
    msg = request.form.get("msg", "").strip()
    
    try:
        msg_lower = msg.lower()
        
        # Special cases - no RAG needed
        creator_keywords = ["who created", "who made", "who is your creator", "who is your owner", 
                          "who is your founder", "who built", "who developed", "who designed"]
        
        greetings = ["hello", "hi", "hey", "greetings", "good morning", "good afternoon", 
                    "good evening", "good night", "whats up", "what's up"]
        
        # Check for creator question
        if any(keyword in msg_lower for keyword in creator_keywords):
            answer = "I was created by Afridi for his beloved wife Elara Mustarin Nisa as a gift."
            sources = []
            
        # Check for greeting
        elif msg_lower in greetings or msg_lower.startswith(("hello ", "hi ", "hey ")):
            answer = "Hello! I'm Elarova, a professional medical assistant chatbot. How can I help you today?"
            sources = []
            
        # All other questions - use RAG
        else:
            response = rag_chain.invoke({"input": msg})
            answer = response["answer"]
            context_documents = response["context"]
            
            # Extract sources from context
            sources = []
            for doc in context_documents:
                if 'source' in doc.metadata and 'page' in doc.metadata:
                    filename = os.path.basename(doc.metadata['source'])
                    sources.append(f"{filename} (Page {int(doc.metadata['page'])})")
            sources = list(set(sources))
        
        # Format the answer - clean up bold markers
        formatted_answer = answer.replace("**", "<strong>").replace("**", "</strong>")
        
        # Format with proper spacing and line breaks
        formatted_answer = formatted_answer.strip()
        formatted_answer = formatted_answer.replace("\n\n", "<br><br>")
        formatted_answer = formatted_answer.replace("\n", "<br>")
        
        # Add sources if available
        if sources:
            formatted_answer += "<br><br>---<br><strong>Sources:</strong><br>" + "<br>".join(sources)
        
        print("Response:", formatted_answer)
        return formatted_answer
        
    except Exception as e:
        print(f"Error: {e}")
        return "An error occurred. Please try again."


if __name__ == '__main__':
    app.run(host="127.0.0.1", port=8080, debug=False)

from flask import Flask, render_template, jsonify, request, Response, stream_with_context
from src.helper import download_hugging_face_embeddings, load_single_pdf, text_split
from langchain_pinecone import Pinecone
from langchain_ollama import ChatOllama
from langchain_core.runnables import RunnablePassthrough, RunnableParallel
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import HumanMessage, SystemMessage
from dotenv import load_dotenv
from src.prompt import *
import os
import base64
import uuid
from pinecone import Pinecone as PineconeClient

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

default_retriever = docsearch.as_retriever(search_type="similarity", search_kwargs={"k": 5})

llm = ChatOllama(model="llama3.2:1b", temperature=0.4)

system_prompt = system_prompt

conversation_history = {}

MAX_HISTORY = 10


def get_conversation_history(namespace):
    """Get conversation history for a namespace"""
    if namespace not in conversation_history:
        conversation_history[namespace] = []
    return conversation_history[namespace]


def add_to_history(namespace, user_msg, assistant_msg):
    """Add a conversation turn to history"""
    if namespace not in conversation_history:
        conversation_history[namespace] = []
    conversation_history[namespace].append({"user": user_msg, "assistant": assistant_msg})
    if len(conversation_history[namespace]) > MAX_HISTORY:
        conversation_history[namespace] = conversation_history[namespace][-MAX_HISTORY:]


def build_history_context(namespace):
    """Build context string from conversation history"""
    history = get_conversation_history(namespace)
    if not history:
        return ""
    
    context_parts = []
    for turn in history:
        context_parts.append(f"User: {turn['user']}")
        context_parts.append(f"Assistant: {turn['assistant']}")
    
    return "\n".join(context_parts)


def get_retriever_for_namespace(namespace=None):
    """Get a retriever for a specific namespace or default"""
    if namespace:
        user_retriever = docsearch.as_retriever(
            search_type="similarity", 
            search_kwargs={"k": 3},
            namespace=namespace
        )
        return user_retriever
    return default_retriever


def get_combined_retriever(namespace=None):
    """Get a retriever - searches user namespace if has data, otherwise uses default"""
    if namespace:
        from pinecone import Pinecone as PineconeClient
        
        pc = PineconeClient(api_key=PINECONE_API_KEY)
        index = pc.Index(index_name)
        stats = index.describe_index_stats()
        
        if namespace in stats.get('namespaces', {}) and stats['namespaces'][namespace].get('vector_count', 0) > 0:
            return docsearch.as_retriever(
                search_type="similarity",
                search_kwargs={"k": 5},
                namespace=namespace
            )
    
    return docsearch.as_retriever(search_type="similarity", search_kwargs={"k": 5})


def create_rag_chain(retriever):
    """Create a RAG chain with the given retriever"""
    return (
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
        
        image_file = request.files.get("image")
        image_data = None
        if image_file:
            image_data = base64.b64encode(image_file.read()).decode('utf-8')
        
        llm = get_llm(model)
        
        if image_data:
            prompt = f"""User sent an image and asked: {message}

Please analyze the image and answer the question based on what you see."""
        else:
            prompt = message
        
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
        
        if not isinstance(answer, str):
            answer = str(answer)
        
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
    if request.is_json:
        data = request.get_json()
        msg = data.get("msg", "").strip() if data else ""
        namespace = data.get("namespace", None)
    else:
        msg = request.form.get("msg", "").strip()
        namespace = request.form.get("namespace", None)
    
    try:
        msg_lower = msg.lower()
        
        creator_keywords = ["who created", "who made", "who is your creator", "who is your owner", 
                          "who is your founder", "who built", "who developed", "who designed"]
        
        greetings = ["hello", "hi", "hey", "greetings", "good morning", "good afternoon", 
                    "good evening", "good night", "whats up", "what's up"]
        
        if any(keyword in msg_lower for keyword in creator_keywords):
            answer = "I was created by Afridi for his beloved wife Elara Mustarin Nisa as a gift."
            sources = []
            
        elif msg_lower in greetings or msg_lower.startswith(("hello ", "hi ", "hey ")):
            answer = "Hello! I'm Elarova, a professional medical assistant chatbot. How can I help you today?"
            sources = []
            
        else:
            history_context = build_history_context(namespace)
            
            extend_keywords = ["elaborate", "extend", "more detail", "more details", "explain more", 
                             "tell me more", "can you elaborate", "please elaborate", "go deeper",
                             "expand on", "explain in detail", "more information", "more info"]
            
            is_extend_request = any(keyword in msg_lower for keyword in extend_keywords)
            
            if is_extend_request and history_context:
                full_input = f"Previous conversation:\n{history_context}\n\nUser's follow-up question: {msg}"
            else:
                full_input = msg
            
            retriever = get_combined_retriever(namespace)
            rag_chain = create_rag_chain(retriever)
            response = rag_chain.invoke({"input": full_input})
            answer = response["answer"]
            context_documents = response["context"]
            
            print(f"DEBUG - Retrieved {len(context_documents)} context documents")
            for doc in context_documents:
                print(f"  - {doc.page_content[:100]}...")
            
            sources = []
            for doc in context_documents:
                if 'source' in doc.metadata and 'page' in doc.metadata:
                    filename = os.path.basename(doc.metadata['source'])
                    sources.append(f"{filename} (Page {int(doc.metadata['page'])})")
            sources = list(set(sources))
            
            add_to_history(namespace, msg, answer)
        
        formatted_answer = answer.replace("**", "<strong>").replace("**", "</strong>")
        formatted_answer = formatted_answer.strip()
        formatted_answer = formatted_answer.replace("\n\n", "<br><br>")
        formatted_answer = formatted_answer.replace("\n", "<br>")
        
        if sources:
            formatted_answer += "<br><br>---<br><strong>Sources:</strong><br>" + "<br>".join(sources)
        
        print("Response:", formatted_answer)
        return formatted_answer
        
    except Exception as e:
        print(f"Error: {e}")
        return "An error occurred. Please try again."


@app.route("/get-stream", methods=["POST"])
def chat_stream():
    """Streaming chat endpoint"""
    if request.is_json:
        data = request.get_json()
        msg = data.get("msg", "").strip() if data else ""
        namespace = data.get("namespace", None)
    else:
        msg = request.form.get("msg", "").strip()
        namespace = request.form.get("namespace", None)
    
    def generate():
        try:
            msg_lower = msg.lower()
            
            creator_keywords = ["who created", "who made", "who is your creator", "who is your owner", 
                              "who is your founder", "who built", "who developed", "who designed"]
            
            greetings = ["hello", "hi", "hey", "greetings", "good morning", "good afternoon", 
                        "good evening", "good night", "whats up", "what's up"]
            
            if any(keyword in msg_lower for keyword in creator_keywords):
                answer = "I was created by Afridi for his beloved wife Elara Mustarin Nisa as a gift."
                sources = []
                
            elif msg_lower in greetings or msg_lower.startswith(("hello ", "hi ", "hey ")):
                answer = "Hello! I'm Elarova, a professional medical assistant chatbot. How can I help you today?"
                sources = []
                
            else:
                history_context = build_history_context(namespace)
                
                extend_keywords = ["elaborate", "extend", "more detail", "more details", "explain more", 
                                 "tell me more", "can you elaborate", "please elaborate", "go deeper",
                                 "expand on", "explain in detail", "more information", "more info"]
                
                is_extend_request = any(keyword in msg_lower for keyword in extend_keywords)
                
                if is_extend_request and history_context:
                    full_input = f"Previous conversation:\n{history_context}\n\nUser's follow-up question: {msg}"
                else:
                    full_input = msg
                
                retriever = get_retriever_for_namespace(namespace)
                rag_chain = create_rag_chain(retriever)
                response = rag_chain.invoke({"input": full_input})
                answer = response["answer"]
                context_documents = response["context"]
                
                sources = []
                for doc in context_documents:
                    if 'source' in doc.metadata and 'page' in doc.metadata:
                        filename = os.path.basename(doc.metadata['source'])
                        sources.append(f"{filename} (Page {int(doc.metadata['page'])})")
                sources = list(set(sources))
                
                add_to_history(namespace, msg, answer)
            
            formatted_answer = answer.replace("**", "<strong>").replace("**", "</strong>")
            formatted_answer = formatted_answer.strip()
            
            for chunk in formatted_answer.split('\n\n'):
                yield f"data: {chunk}\n\n"
                import time
                time.sleep(0.05)
            
            if sources:
                yield f"data: <br><br>---<br><strong>Sources:</strong><br>" + "<br>".join(sources) + "\n\n"
            
            yield "data: [DONE]\n\n"
            
        except Exception as e:
            print(f"Stream error: {e}")
            yield f"data: Error: {str(e)}\n\n"
    
    return Response(stream_with_context(generate()), mimetype="text/event-stream")


@app.route("/upload-pdf", methods=["POST"])
def upload_pdf():
    """Upload a PDF and index it to a namespace"""
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        namespace = request.form.get('namespace', None)
        
        if not file.filename.endswith('.pdf'):
            return jsonify({"error": "Only PDF files are allowed"}), 400
        
        if not namespace:
            return jsonify({"error": "Namespace is required"}), 400
        
        temp_dir = os.path.join(os.path.dirname(__file__), 'temp')
        os.makedirs(temp_dir, exist_ok=True)
        
        temp_filename = f"{uuid.uuid4()}_{file.filename}"
        temp_path = os.path.join(temp_dir, temp_filename)
        file.save(temp_path)
        
        try:
            documents = load_single_pdf(temp_path)
            text_chunks = text_split(documents)
            
            Pinecone.from_documents(
                documents=text_chunks,
                index_name=index_name,
                embedding=embeddings,
                namespace=namespace
            )
            
            return jsonify({
                "success": True,
                "message": "PDF indexed successfully",
                "namespace": namespace,
                "chunks": len(text_chunks)
            })
            
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)
                
    except Exception as e:
        print(f"Upload error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/delete-document", methods=["DELETE"])
def delete_document():
    """Delete all vectors in a namespace"""
    try:
        data = request.get_json()
        namespace = data.get('namespace')
        
        if not namespace:
            return jsonify({"error": "Namespace is required"}), 400
        
        pc = PineconeClient(api_key=PINECONE_API_KEY)
        index = pc.Index(index_name)
        
        try:
            index.delete(namespace=namespace)
        except Exception as e:
            print(f"Namespace deletion warning: {e}")
        
        return jsonify({
            "success": True,
            "message": f"Namespace {namespace} cleared"
        })
        
    except Exception as e:
        print(f"Delete error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/clear-namespace", methods=["POST"])
def clear_namespace():
    """Clear all vectors in a namespace"""
    return delete_document()


@app.route("/my-documents", methods=["GET"])
def my_documents():
    """List documents info (for user reference)"""
    namespace = request.args.get('namespace', None)
    
    if not namespace:
        return jsonify({"documents": []})
    
    try:
        pc = PineconeClient(api_key=PINECONE_API_KEY)
        index = pc.Index(index_name)
        
        stats = index.describe_index_stats()
        
        namespace_found = namespace in stats.get('namespaces', {})
        
        return jsonify({
            "namespace": namespace,
            "exists": namespace_found,
            "vector_count": stats['namespaces'].get(namespace, {}).get('vector_count', 0) if namespace_found else 0
        })
        
    except Exception as e:
        print(f"Documents info error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/clear-history", methods=["POST"])
def clear_history():
    """Clear conversation history for a namespace"""
    try:
        if request.is_json:
            data = request.get_json()
            namespace = data.get("namespace", None)
        else:
            namespace = request.form.get("namespace", None)
        
        if namespace and namespace in conversation_history:
            del conversation_history[namespace]
        
        return jsonify({"success": True, "message": "History cleared"})
    except Exception as e:
        print(f"Clear history error: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(host="127.0.0.1", port=8080, debug=False)

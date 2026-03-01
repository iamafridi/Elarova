from src.helper import load_pdf_file, text_split, download_hugging_face_embeddings

from pinecone import ServerlessSpec
from langchain_pinecone import Pinecone
from dotenv import load_dotenv
import os


load_dotenv()

PINECONE_API_KEY=os.environ.get('PINECONE_API_KEY')
PINECONE_CLOUD="aws"
PINECONE_REGION="us-east-1"
os.environ["PINECONE_API_KEY"] = PINECONE_API_KEY
os.environ["PINECONE_CLOUD"] = PINECONE_CLOUD
os.environ["PINECONE_REGION"] = PINECONE_REGION


CHUNK_SIZE = int(os.environ.get('CHUNK_SIZE', 500))
CHUNK_OVERLAP = int(os.environ.get('CHUNK_OVERLAP', 20))

extracted_data=load_pdf_file(data='Data/')
text_chunks=text_split(extracted_data, chunk_size=CHUNK_SIZE, chunk_overlap=CHUNK_OVERLAP)
embeddings = download_hugging_face_embeddings()



# Embed each chunk and upsert the embeddings into your Pinecone index.
index_name = "elarova" # Ensure index_name is defined before use
docsearch = Pinecone.from_documents(
    documents=text_chunks,
    index_name=index_name,
    embedding=embeddings, 
)
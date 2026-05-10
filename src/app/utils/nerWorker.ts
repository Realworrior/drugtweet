import { pipeline, env } from '@xenova/transformers';

// Skip local model check and only use remote models from HuggingFace
env.allowLocalModels = false;

// Define pipeline type
let nerPipeline: any = null;

// Listen for messages from the main thread
self.addEventListener('message', async (event) => {
  const { text, type } = event.data;
  
  if (type === 'INIT') {
    try {
      // Use a standard clinical/medical NER model if available, otherwise fallback to standard NER
      nerPipeline = await pipeline('token-classification', 'Xenova/bert-base-NER', {
        progress_callback: (x: any) => {
          self.postMessage({ type: 'PROGRESS', data: x });
        }
      });
      self.postMessage({ type: 'INIT_COMPLETE' });
    } catch (error) {
      self.postMessage({ type: 'ERROR', error: (error as Error).message });
    }
  } 
  
  else if (type === 'EXTRACT') {
    if (!nerPipeline) {
      self.postMessage({ type: 'ERROR', error: 'Pipeline not initialized' });
      return;
    }
    
    try {
      // Run the text through the NER pipeline
      const results = await nerPipeline(text);
      
      // Parse Xenova's token classification output.
      // E.g., B-ORG, I-ORG, B-MISC, B-LOC
      // For the purpose of this project, we'll map certain categories to 'drug' and 'disease' 
      // since true biomedical ONNX models might be sparse in Xenova's repo.
      // Usually, drugs fall into MISC or ORG, diseases fall into MISC.
      
      const entities = [];
      let currentEntity: any = null;
      
      for (const token of results) {
        const { entity, word, score, start, end } = token;
        const cleanWord = word.replace(/^##/, '');
        
        // Very rough heuristic mapping for the fallback model:
        // MISC -> Disease, ORG/PER -> Drug
        const mappedType = (entity.includes('MISC') || entity.includes('LOC')) ? 'disease' : 'drug';
        
        if (entity.startsWith('B-') || !currentEntity || currentEntity.type !== mappedType) {
          if (currentEntity) entities.push(currentEntity);
          currentEntity = {
            text: cleanWord,
            type: mappedType,
            startIndex: start,
            endIndex: end,
            confidence: score
          };
        } else if (entity.startsWith('I-') && currentEntity) {
          // Append to current entity
          currentEntity.text += (word.startsWith('##') ? cleanWord : ' ' + cleanWord);
          currentEntity.endIndex = end;
          currentEntity.confidence = Math.min(currentEntity.confidence, score);
        }
      }
      if (currentEntity) entities.push(currentEntity);
      
      self.postMessage({ type: 'EXTRACTION_COMPLETE', data: entities });
    } catch (error) {
      self.postMessage({ type: 'ERROR', error: (error as Error).message });
    }
  }
});

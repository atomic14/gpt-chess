import { faCopy } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useState } from "react";
import { Button, Form, InputGroup, Modal, Spinner } from "react-bootstrap";
import { Color } from 'chess.js'
import CopyToClipboard from "react-copy-to-clipboard";
import { toast } from "react-toastify";
import ChessGPT from "../chess_master_2000/ChessGPT";

type AIMoveModalProps = {
  showModal: boolean;
  ai: ChessGPT;
  fen: string;
  pgn: string;
  ascii: string;
  boardDescription: string;
  validMoves: string[];
  aiColor: Color;
  onMove: (move: string, reason: string) => void;
  setApiKey: (key: string) => void;
  apiKey: string;
}

export default function AIMoveModal({ showModal, ai, fen, pgn, ascii, boardDescription, validMoves, aiColor, onMove, apiKey, setApiKey }: AIMoveModalProps) {
  const [selectedOption, setSelectedOption] = useState<'apiKey' | 'copyPrompt'>('apiKey');
  const [manualMove, setManualMove] = useState('');
  const [showSpinner, setShowSpinner] = useState(false);
  const [model, setModel] = useState('gpt-4o');
  const [prompt, setPrompt] = useState('');
  const [invalidAttemptedMoves, setInvalidAttemptedMoves] = useState<string[]>([]);
  const [estimatedTokens, setEstimatedTokens] = useState(0);

  useEffect(() => {
    const prompt = ai.getUserPrompt({ fen, pgn, ascii, boardDescription, validMoves, invalidAttemptedMoves, aiColor });
    const estimatedTokens = ai.getEstimatedTokens({ fen, pgn, ascii, boardDescription, validMoves, invalidAttemptedMoves, aiColor });
    setEstimatedTokens(estimatedTokens);
    setPrompt(prompt);
  }, [fen, pgn, ascii, boardDescription, model, ai, validMoves, aiColor, invalidAttemptedMoves]);

  const manualMoveInvalid = manualMove !== '' && !validMoves.includes(manualMove);

  async function sendRequest() {
    setShowSpinner(true);
    try {
      const aiMove = await ai.getNextMove({
        fen,
        pgn,
        ascii,
        boardDescription,
        validMoves,
        invalidAttemptedMoves,
        aiColor,
        model,
        apiKey
      });
      const kTokens = (aiMove.tokensUsed || 0) / 1000;
      const cost = model === 'gpt-4' ? 0.03 * kTokens : 0.002 * kTokens;
      // check the move is valid
      console.log('validMoves', validMoves)
      console.log('aiMove.san', aiMove.san)
      console.log('validMoves.includes(aiMove.san)', validMoves.includes(aiMove.san));
      if (!validMoves.includes(aiMove.san)) {
        toast.error(`ChatGPT tried to make the invalide move ${aiMove.san}\nUpdating prompt to help it.\nTokens Used: ${aiMove.tokensUsed} ($${cost.toFixed(4)})`);
        setInvalidAttemptedMoves([...invalidAttemptedMoves, aiMove.san]);
      } else {
        toast.success(`ChatGPT makes the move: ${aiMove.san}\nTokens Used: ${aiMove.tokensUsed} ($${cost.toFixed(4)})`);
        // successful move - make sure we clear any invalid moves
        setInvalidAttemptedMoves([]);
        onMove(aiMove.san, aiMove.reason);
      }
    } catch (e: any) {
      toast.error(`Something went wrong, please try again later: ${e.message}`);
    }
    setShowSpinner(false);
  }

  return (
    <Modal show={showModal}>
      <Modal.Header>
        <Modal.Title>It's the AI's turn</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group>
            <Form.Check
              disabled={showSpinner}
              type="radio"
              label="Use OpenAI API Key"
              value="apiKey"
              checked={selectedOption === 'apiKey'}
              onChange={() => setSelectedOption('apiKey')}
              name="formRadio"
              id="formRadioApiKey"
            />
            <Form.Check
              disabled={showSpinner}
              type="radio"
              label="Copy prompt"
              value="copyPrompt"
              checked={selectedOption === 'copyPrompt'}
              onChange={() => setSelectedOption('copyPrompt')}
              name="formRadio"
              id="formRadioCopyPrompt"
            />
          </Form.Group>
          <hr />
          {selectedOption === 'apiKey' && (
            <>
              <Form.Group>
                <Form.Label>API Key (Don't worry this is only used locally)</Form.Label>
                <Form.Control
                  required
                  disabled={showSpinner}
                  type="password"
                  placeholder="Enter API Key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)} />
              </Form.Group>
              <Form.Group>
                <Form.Check
                  disabled={showSpinner}
                  type="radio"
                  label="Use gpt-3.5-turbo (Cheap, but not good)"
                  value="gpt-3.5-turbo"
                  checked={model === "gpt-3.5-turbo"}
                  onChange={() => setModel("gpt-3.5-turbo")}
                  name="formRadioModel"
                  id="formRadioModelGpt35Turbo"
                />
                <Form.Check
                  disabled={showSpinner}
                  type="radio"
                  label="Use gpt-4"
                  value="gpt-4"
                  checked={model === 'gpt-4'}
                  onChange={() => setModel('gpt-4')}
                  name="formRadioModel"
                  id="formRadioModelGpt4"
                />
                <Form.Check
                  disabled={showSpinner}
                  type="radio"
                  label="Use gpt-4o"
                  value="gpt-4o"
                  checked={model === 'gpt-4o'}
                  onChange={() => setModel('gpt-4o')}
                  name="formRadioModel"
                  id="formRadioModelGpt4"
                />
                <Form.Check
                  disabled={showSpinner}
                  type="radio"
                  label="Use gpt-4o-mini"
                  value="gpt-4o-mini"
                  checked={model === 'gpt-4o-mini'}
                  onChange={() => setModel('gpt-4o-mini')}
                  name="formRadioModel"
                  id="formRadioModelGpt4"
                />
              </Form.Group>
              <Form.Group>
                <Form.Label>This is the prompt that will sent to the AI:</Form.Label>
                <InputGroup>
                  <Form.Control as="textarea" rows={10} placeholder="Enter prompt" readOnly value={prompt} />
                  <CopyToClipboard text={prompt} onCopy={() => toast.success(`Copied prompt to clipboard`)}>
                    <Button variant="outline"><FontAwesomeIcon icon={faCopy} /></Button>
                  </CopyToClipboard>
                </InputGroup>
                <div>We will use approx {estimatedTokens} tokens</div>
              </Form.Group>
            </>
          )}

          {selectedOption === 'copyPrompt' && (
            <>
              <Form.Group>
                <Form.Label>Copy this prompt into the ChatGPT window</Form.Label>
                <InputGroup>
                  <Form.Control as="textarea" rows={10} placeholder="Enter prompt" readOnly value={prompt} />
                  <CopyToClipboard text={prompt} onCopy={() => toast.success(`Copied prompt to clipboard`)}>
                    <Button variant="outline"><FontAwesomeIcon icon={faCopy} /></Button>
                  </CopyToClipboard>
                </InputGroup>
              </Form.Group>
              <Form.Group>
                <Form.Label>Once you have the result from the AI (e.g. Nf3), paste it here:</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter chess move in SAN format"
                  value={manualMove}
                  onChange={(e) => setManualMove(e.target.value)}
                  required
                  isInvalid={manualMoveInvalid}
                />
              </Form.Group>
            </>
          )}
        </Form>
      </Modal.Body>
      <Modal.Footer>
        {selectedOption === 'apiKey' && (
          <>
            {showSpinner &&
              <>
                Thinking...<Spinner animation="border" role="status" variant="primary">
                  <span className="sr-only"></span>
                </Spinner>
              </>
            }
            <Button variant="primary" onClick={sendRequest} disabled={!apiKey}>
              Send Request
            </Button>
          </>)}
        {selectedOption === 'copyPrompt' && (
          <Button variant="primary" disabled={manualMove === '' || manualMoveInvalid} onClick={() => { onMove(manualMove, '') }}>
            Make Move
          </Button>)}
      </Modal.Footer>
    </Modal >
  );
}

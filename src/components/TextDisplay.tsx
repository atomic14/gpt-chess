import { faCopy } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Button, Form } from "react-bootstrap";
import CopyToClipboard from "react-copy-to-clipboard";
import { toast } from "react-toastify";

type TextDisplayProps = {
  title: string;
  text: string;
  breakAnywhere?: boolean;
};

export default function TextDisplay({ title, text, breakAnywhere = false }: TextDisplayProps) {
  return (
    <Form>
      <Form.Group controlId="exampleForm.ControlTextarea1">
        <Form.Label>{title}:</Form.Label>
        <div className="textarea-container">
          <div className="text-display" style={{ lineBreak: breakAnywhere ? 'anywhere' : 'normal' }}>{text}</div>
          <CopyToClipboard text={text} onCopy={() => toast.success(`Copied ${title} to clipboard`)}>
            <Button variant="ghost" className="copy-button">
              <FontAwesomeIcon icon={faCopy} />
            </Button>
          </CopyToClipboard>
        </div>
      </Form.Group>
    </Form>
  );
}
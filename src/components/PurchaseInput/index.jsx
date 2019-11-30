import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
} from "@chakra-ui/core";

import './index.css';

export default function PurchaseInput() {
  const [inputHasContent, setInputHasContent] = useState(false);

  const onInputChange = (e) => {
    const inputValue = e.target.value;
    if (inputValue !== "") {
      setInputHasContent(true);
    } else {
      setInputHasContent(false);
    }
  }

  return (
    <div className="input-container">
      <label className={inputHasContent ? "prefix prefix-active" : "prefix"}>$</label>
      <input className="purchase-input" type="number" minlength="1" placeholder="0" onChange={onInputChange} />
    </div>
  );
}

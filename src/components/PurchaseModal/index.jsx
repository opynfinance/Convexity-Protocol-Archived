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
  Flex,
  Box,
  Icon,
  Link,
  // IconButton
} from "@chakra-ui/core";

import PurchaseInput from '../PurchaseInput';
import Select from 'react-select';

import daiIcon from './assetLogos/dai-icon.svg';
import cDAIIcon from './assetLogos/cDAI-icon.svg';
import cUSDCIcon from './assetLogos/cUSDC-icon.svg';

import './index.css';

const options = [
  { value: 'DAI', label: 'DAI',  },
  { value: 'cDAI', label: 'cDAI',  },
  { value: 'cUSDC', label: 'cUSDC',  }
];

const assetToIconSrc = {
  "DAI": daiIcon,
  "cDAI": cDAIIcon,
  "cUSDC": cUSDCIcon,
};

// TODO: clean me
const customStyles = {
  option: (provided, state) => ({
    ...provided,
    display: 'flex',
    alignItems: 'center',
    height: '52px',
    fontSize: '16px',
  }),
  control: (provided) => ({
    ...provided,
    height: '52px',
    fontSize: '16px',
  }),
  singleValue: (provided, state) => {
    // const opacity = state.isDisabled ? 0.5 : 1;
    // const transition = 'opacity 300ms';

    return { ...provided };
  }
}

function getLabel({ value, label }) {
    return (
      <div style={{ alignItems: 'center', display: 'flex' }}>
        <span style={{ fontSize: 18, marginRight: '0.5em' }}>
          { assetToIconSrc[value] && <img className="asset-icon" src={assetToIconSrc[value]} alt={label} /> }
          </span>
        <span style={{ fontSize: 14 }}>{label}</span>
      </div>
    );
}

function DynamicModalContent({ step, setStep, onClose }) {
  console.log(step);
  switch (step) {
    case 0:
      return (
        <React.Fragment>
          <ModalHeader mt="8px" pl="4px"><div className="modal-title">Amount to Insure</div></ModalHeader>
          <ModalCloseButton border="0px" />

          <ModalBody>
            <Box mb={8}>
              <PurchaseInput />
            </Box>
            <Select styles={customStyles} defaultValue={{ value: 'DAI', label: 'DAI', }} isSearchable={false} formatOptionLabel={getLabel} options={options} />
          </ModalBody>

          <ModalFooter>
            <Button
              size="lg"
              height="48px"
              width="100%"
              background="#27AE60"
              border="0px"
              color="#ffffff"
              onClick={() => setStep(step + 1)}
              _hover={{ bg: "#34ab66" }}
              _active={{
                bg: "#34ab66",
                transform: "scale(0.98)",
                borderColor: "#bec3c9",
              }}
            >
              Confirm Purchase
            </Button>
          </ModalFooter>
        </React.Fragment>
      );
    case 1:
      return (
        <React.Fragment>
          <ModalHeader mt="8px">
            <Flex direction="row" justifyContent="space-between" mr="8">
              {/* use a button here instead and reset styling */}
              <div onClick={()=>setStep(step - 1)}>
                <Icon name="arrow-back" size="24px" color="#b0b0b0" />
              </div>
              <div className="modal-title">You are insuring</div>
              <div></div>
            </Flex>
          </ModalHeader>
          <ModalCloseButton border="0px" />

          <ModalBody>
            <div className="insured-amount">
              <span>100</span><span className="insured-amount-suffix">DAI</span>
            </div>
            <div className="details-list">
              <div className="details-row">
                <span className="details-row-leading">Duration</span>
                <span className="details-row-trailing">6 months</span>
              </div>
              <div className="details-row">
                <span className="details-row-leading">Total</span>
                <span className="details-row-trailing">3 USD</span>
              </div>
            </div>
            <div className="claim-disclaimer">
              If you claim before expiry you are not guaranteed your full amount.&nbsp;
              <Link color="#6979F8" href="#">Learn more <Icon name="external-link" mx="1px" mb="1px" /></Link>
            </div>
          </ModalBody>

          <ModalFooter>
            <Button
              size="lg"
              height="48px"
              width="100%"
              background="#27AE60"
              border="0px"
              color="#ffffff"
              _hover={{ bg: "#34ab66" }}
              _active={{
                bg: "#34ab66",
                transform: "scale(0.98)",
                borderColor: "#bec3c9",
              }}
              onClick={()=>setStep(step + 1)}
            >
              Buy Insurance
            </Button>
          </ModalFooter>
        </React.Fragment>
      );
    case 2:
      return (
        <React.Fragment>
          <ModalCloseButton border="0px" />
          <ModalBody>
            <Box mt="24px">
              <Flex align="center" justify="center">
                {/* copy pasted from here https://codepen.io/istiaktridip/pen/BZqaOd */}
                <div class="success-checkmark">
                  <div class="check-icon">
                    <span class="icon-line line-tip"></span>
                    <span class="icon-line line-long"></span>
                    <div class="icon-circle"></div>
                    <div class="icon-fix"></div>
                  </div>
                </div>
              </Flex>
              <div className="success-description">
                You have succesfully insured 100 DAI
              </div>
            </Box>
          </ModalBody>

          <ModalFooter>
            <Button
              size="lg"
              height="48px"
              width="100%"
              background="#27AE60"
              border="0px"
              color="#ffffff"
              _hover={{ bg: "#34ab66" }}
              _active={{
                bg: "#34ab66",
                transform: "scale(0.98)",
                borderColor: "#bec3c9",
              }}
              onClick={onClose}
            >
              Done
            </Button>
          </ModalFooter>
        </React.Fragment>
      );
    default:
      return null;
  }
}
export default function PurchaseModal({isOpen, onClose}) {

  // TODO: make me better
  const [step, setStep] = useState(0);

  const closeAndResetStep = () => {
    setStep(0);
    onClose();
  }

  return (
      <Modal isOpen={isOpen} onClose={closeAndResetStep} width="100px" size="sm">
      <ModalOverlay />
        <ModalContent>
          <DynamicModalContent step={step} setStep={setStep} onClose={closeAndResetStep} />
        </ModalContent>
    </Modal>
  );
}

import React from 'react';
import './index.css';
import logo from './logo.svg';

import { Box, Flex, Button, useDisclosure } from "@chakra-ui/core";
import { Link, HashRouter } from 'react-router-dom';
import PurchaseModal from '../PurchaseModal';

export default function Header() {
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <header className="header">
      <div className="logo">
        {/* TODO: optimize this image/svg */}
        <Link to="/home"><img src={logo} alt="Logo" /></Link>
      </div>

      <PurchaseModal isOpen={isOpen} onClose={onClose} />

      <Flex direction="row">
        <Box mr={4}>
          <Button
            border="0px"
            background="#6979F8"
            color="#FFFFFF"
            onClick={onOpen}
          >
            Get Insurance
          </Button>
        </Box>
        <Box>
          <Button
            background="#FFFFFF"
            color="#6979F8"
            borderColor="#6979F8"
          >
            Connect Wallet
          </Button>
        </Box>
      </Flex>
    </header>
  );
}

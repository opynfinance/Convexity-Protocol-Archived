import React from 'react';
import { ThemeProvider, theme, Button, Box, Heading, Flex, useDisclosure, Icon} from "@chakra-ui/core";
import { Link} from 'react-router-dom';

import Header from "./components/Header";
import Container from "./components/Container";
import DetailContainer from "./components/DetailContainer";
import PurchaseInsuranceTable from "./components/PurchaseInsuranceTable";
import InsuredAssetsTable from "./components/InsuredAssetsTable";
import Card from './components/Card';
import ClaimModal from './components/ClaimModal';
import { Route, BrowserRouter, Switch} from 'react-router-dom';
import './app.css';

import daiIcon from './assetLogos/dai-icon.svg';

function App() {
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
  <ThemeProvider theme = { theme } >
  <BrowserRouter>
    <Switch>
      <Route path="/home">
          <Container>
            <Header />
              <Flex direction="row">
                <Box mr="5">
                  <Card>
                    <div className="card-title">Insured</div>
                    <div className="card-amount card-amount-insured">$10,000.00</div>
                  </Card>
                </Box>
                <Box mr="5">
                  <Card>
                    <div className="card-title">Uninsured</div>
                    <div className="card-amount card-amount-uninsured">$1,000.00</div>
                  </Card>
                </Box>
              </Flex>
              <Box pt="32px" pl="4px">
                <Heading size="lg">Insured Assets</Heading>
                <InsuredAssetsTable />
              </Box>
              <Box pt="4px" pl="4px">
                <Heading size="lg">Purchase Insurance</Heading>
                <PurchaseInsuranceTable />
              </Box>
          </Container>
      </Route>
      <Route path="/assets/dai">
          <Container>
            <Header />
            <Link to="/home" style={{ textDecoration: 'none' }}><Icon name="arrow-back" size="24px" color="#b0b0b0" /><span className="back-text">Back</span></Link>
          </Container>
          <DetailContainer>
            <Heading><Flex align="center"><Box pr="5px" pt="5px"><img src={daiIcon} alt="" /></Box>DAI</Flex></Heading>
            <Flex direction="row">
              <Box pr="4">
                <Card>
                  <Box pb="36px">
                    <div className="card-title">DAI Insured</div>
                    <div className="card-amount card-amount-insured">$10,000.00</div>
                  </Box>
                    <ClaimModal isOpen={isOpen} onClose={onClose} />
                    <Button width="100%" color="white" background="#27AE60" onClick={onOpen}>Claim</Button>
                </Card>
              </Box>
                <Card>
                  <Box pb="36px">
                  <div className="card-title">DAI Uninsured</div>
                  <div className="card-amount card-amount-uninsured">$1,000.00</div>
                  </Box>
                  <Button width="100%" color="white" background="#6979F8">Buy Insurance</Button>
                </Card>
            </Flex>
            <Box pt="24px">
              <Card>
                <Flex>
                  <Box pr="72px">
                    <div className="card-title-duration">Remaining Duration</div>
                    <div className="card-description">6 months, 3 days</div>
                  </Box>
                  <div>
                    <div className="card-title-duration">Expiry Date</div>
                    <div className="card-description">12/31/2019</div>
                  </div>
                </Flex>
              </Card>
            </Box>
          </DetailContainer>
      </Route>
      <Route path="/assets/cdai">
          <Header />
      </Route>
      <Route path="/assets/cusdc">
          <Header />
      </Route>
    </Switch>
  </BrowserRouter>
  </ThemeProvider>
  );
}

export default App;

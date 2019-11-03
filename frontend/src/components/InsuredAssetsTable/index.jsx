import React from 'react';
import { Column, Table } from 'react-virtualized';
import './table.css';
import './index.css';
import { Button } from "@chakra-ui/core";
import { Link } from 'react-router-dom';
import daiIcon from './assetLogos/dai-icon.svg';
import cDAIIcon from './assetLogos/cDAI-icon.svg';
import cUSDCIcon from './assetLogos/cUSDC-icon.svg';

const list = [
  { name: 'DAI', insured: '10,000 DAI', expiring_in: '3 months' },
  { name: 'cDAI', insured: '10,000 cDAI', expiring_in: '6 months' },
  { name: 'cUSDC', insured: '10,000 cUSDC', expiring_in: '4 years' }
];


const assetToIconSrc = {
  "DAI": daiIcon,
  "cDAI": cDAIIcon,
  "cUSDC": cUSDCIcon,
};

const assetToPage = {
  "DAI": "assets/dai",
  "cDAI": "assets/cdai",
  "cUSDC": "assets/cusdc",
};

export default function PurchaseInsuranceTable() {
  return (
    <Table
      width={1000}
      height={230}
      headerHeight={48}
      rowHeight={48}
      rowCount={list.length}
      rowGetter={({ index }) => list[index]}
    >
      <Column
        label='Name'
        dataKey='name'
        width={1000}
        cellRenderer={({ cellData: name }) => (
          <div className="asset-cell">
            {assetToIconSrc[name] && <img className="asset-icon" src={assetToIconSrc[name]} alt={name} />}
            <span>{name}</span>
          </div>
        )}
      />
      <Column
        width={1000}
        label='Insured'
        dataKey='insured'
      />
      <Column
        width={1000}
        label='Expiring IN'
        dataKey='expiring_in'
      />
      <Column
        label="Details"
        dataKey='name'
        width={600}
        cellRenderer={({cellData: name})=>
        <Link style={{ textDecoration: 'none' }} to={assetToPage[name]}>
          <Button
            background="#FFFFFF"
            color="#6979F8"
            borderColor="#6979F8"
            height="36px"
          >
            See Details
          </Button>
        </Link>}
      />
    </Table>
  );
}

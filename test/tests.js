const chai = require('chai');
const expect = chai.expect;

const dynql = require('../dist');

const validNames = [
    'objecta',
    'something',
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    'seperated_name',
    'another.name',
    'utf8_1_Ђ',
    'utf8_2_Ӵ',
    'utf8_3_թ',
    'utf8_4_ࢯ',
    'utf8_5_Ꮆ',
    'utf8_6_Ṹ',
    'utf8_7_ツ',
    'utf8_8_㇎',
    'utf8_9_ꯐ',
    'utf8_10_😀',
    'weird|.chars',
];
const invalidNames = [
    '.name',
    ';name',
    '-name',
    '@include',
    '@skip',
    'fragment',
    'on',
];

describe('isValidName', () => {
    it('correctly checks for valid names', () => {
        validNames.forEach(name => {
            expect(dynql.isValidName(name)).to.equal(true, `"${name}" should have been valid!`);
        });
    });

    it('correctly checks for invalid names', () => {
        invalidNames.forEach(name => {
            expect(dynql.isValidName(name)).to.equal(false, `"${name}" should have been invalid!`);
        });
    });
});

describe('getSpreadFragmentNames', () => {
    it('correctly finds valid spreaded fragment names', () => {
        [
            {
                definition: '{ something { ...test1 } }',
                names: ['test1'],
            },
            {
                definition: '{ something { ...test1 ...test2 } }',
                names: ['test1', 'test2'],
            },
            {
                definition: '{ something { ...test1;...test2 } }',
                names: ['test1', 'test2'],
            },
            {
                definition: '{ something { ...test1...test2 } }',
                names: ['test1', 'test2'],
            },
            {
                definition: '{ something { ...test.one...test.two } }',
                names: ['test.one', 'test.two'],
            }
        ].forEach(item => {
            const actual = dynql.getSpreadFragmentNames(item.definition);
            expect(actual).to.deep.equal(
                item.names,
                `Definition "${item.definition}" gave ["${actual.join('", "')}"], while expecting ["${item.names.join('", "')}"]`
            );
        });
    });
});

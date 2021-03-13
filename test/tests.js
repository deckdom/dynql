const chai = require('chai');
const expect = chai.expect;

const dynql = require('../dist');

const validNames = [
    'objecta',
    'something',
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    'seperated_name',
    '_test',
    '_a_',
    'fragment',
    'hello_w0r7d',
];
const invalidNames = [
    '.name',
    ';name',
    '-name',
    '@include',
    '@skip',
    '0test',
    '1test',
    'on',
    'with.dot',
    'aaa...test',
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
    'another.name',
    'weird|.chars',
    'special;chars',
    '-dash',
    'dash-',
    'da-sh',
    ':colon',
    'colon:',
    'col:on',
];

describe('isValidName', () => {
    it('checks for valid names', () => {
        validNames.forEach(name => {
            expect(dynql.isValidName(name)).to.equal(true, `"${name}" should have been valid!`);
        });
    });

    it('checks for invalid names', () => {
        invalidNames.forEach(name => {
            expect(dynql.isValidName(name)).to.equal(false, `"${name}" should have been invalid!`);
        });
    });
});

describe('getSpreadFragmentNames', () => {
    it('finds all valid spreaded fragment names', () => {
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
                definition: '{ something { ... test1... test2 } }',
                names: ['test1', 'test2'],
            },
            {
                definition: '{ something { ...test_one...test_two } }',
                names: ['test_one', 'test_two'],
            },
            {
                definition: '{ something { ...test1one...test_two } }',
                names: ['test1one', 'test_two'],
            },
            {
                definition: '{ something { ...test1\n...test2 } }',
                names: ['test1', 'test2'],
            },
        ].forEach(item => {
            const actual = dynql.getSpreadFragmentNames(item.definition);
            expect(actual).to.deep.equal(
                item.names,
                `Definition "${item.definition}" did not give proper results!`
            );
        });
    });
});

describe('getDefinedFragmentNames',() => {
    it('finds all validly defined fragment names', () => {
        validNames.forEach(name => {
            const definition = `fragment ${name} on Something { field }`;
            const actual = dynql.getDefinedFragmentNames(definition);
            expect(actual).to.deep.equal(
                [name],
                `Definition "${definition}" did not give proper results!`
            );
        });
    });

    it('ignores invalidly defined fragment names', () => {
        invalidNames.forEach(name => {
            const definition = `fragment ${name} on Something { field }`;
            const actual = dynql.getDefinedFragmentNames(definition);
            expect(actual).to.deep.equal(
                [],
                `Definition "${definition}" did not give proper results!`
            );
        });
    });
});

describe('findFragmentsFromQuery', () => {
    it('should find all fragments from query', () => {
        const definitions = {
            'test1': ' aaa ',
            'test2': ' ...test1 ',
            'cool_123_name': ' ...test1 ...test2'
        }
        const fragmentMap = {};
        const fragments = Object.entries(definitions)
            .map(([name, value]) => {
                const fragment = `fragment ${name} on AAAAA {${value}}`;
                fragmentMap[name] = fragment;
                return fragment;
            });

        const query = fragments.join('\n') + `
{
    query {
        ...cool_123_name
    }
}`;
        const result = dynql.findFragmentsFromQuery(query);
        expect(result).to.deep.equal(fragmentMap);
    });
});

describe('FragmentStore', () => {
    describe('getFragments', () => {
        it('should get all registered fragments', () => {
            const store = new dynql.FragmentStore();
            const fragment = 'fragment aaa on bbb { value1 }';
            store.registerFragment('aaa', fragment);
            expect(store.getFragments()).to.deep.equal({ 'aaa': fragment });
        });
    });

    describe('registerFragment', () => {
        it('should register fragments with valid names', () => {
            const store = new dynql.FragmentStore();
            validNames.forEach(name => {
                const definition = `fragment ${name} on Something { field }`;
                const result = store.registerFragment(name, definition);
                expect(result).to.be.true;
            });
        });
    
        it('should not register fragments with invalid names', () => {
            const store = new dynql.FragmentStore();
            invalidNames.forEach(name => {
                const definition = `fragment ${name} on Something { field }`;
                const result = store.registerFragment(name, definition);
                expect(result).to.be.false;
            });
        });
    });
    
    describe('unregisterFragment', () => {
        it('should unregister previously registered fragments', () => {
            [
                'tmp1',
                'cool1',
                'hello_world'
            ].forEach(name => {
                const store = new dynql.FragmentStore();
                const previousFragments = [
                    'test1',
                    'test2',
                    'something1',
                    'something2',
                ];
                previousFragments.forEach(prevName => {
                    store.registerFragment(prevName, `fragment ${prevName} on Something { field }`);
                });
                store.registerFragment(name, `fragment ${name} on Something { field }`);
                const resolved = store.resolve(`{ test { ...${name} } }`);
                expect(resolved).not.to.be.empty;
                const response = store.unregisterFragment(name);
                expect(response).to.be.true;
                expect(function() {
                    store.resolve(`{ test { ...${name} } }`);
                }).to.throw(`Could not resolve required fragment ${name}!`);
            });
        });
    
        it('should not unregister not yet registered fragments', () => {
            [
                'tmp1',
                'cool1',
                'hello_world'
            ].forEach(name => {
                const store = new dynql.FragmentStore();
                const previousFragments = [
                    'test1',
                    'test2',
                    'something1',
                    'something2',
                ];
                previousFragments.forEach(prevName => {
                    store.registerFragment(prevName, `fragment ${prevName} on Something { field }`);
                });
                const response = store.unregisterFragment(name);
                expect(response).to.be.false;
                expect(function() {
                    store.resolve(`{ test { ...${name} } }`);
                }).to.throw(`Could not resolve required fragment ${name}!`);
            });
        });
    });

    describe('autoRegisterFragment', () => {
        it('should register all definitions properly', () => {
            const query = '{ something { ...test } }';
            const fragments = {
                'test': 'fragment test on AAAAA { value1 ...something_else }',
                'something_else': 'fragment something_else on BBBBB { value2 }',
                'unused': 'fragment unused on CCCCC { value3 }',
            };
            const fragmentQuery = Object.values(fragments).join('\n');
            const store = new dynql.FragmentStore();
            const registered = store.autoRegisterFragment(fragmentQuery);
            expect(registered).to.deep.equal(['test', 'something_else', 'unused']);

            const resolved = store.resolve(query);
            expect(resolved).to.deep.equal([fragments['test'], fragments['something_else']]);
        });
    });
    
    describe('resolve', () => {
        it('resolve regular dependencies', () => {
            const query = '{ something { ...test } }';
            const store = new dynql.FragmentStore();
            const fragment = 'fragment test on Something { foobar }';
            store.registerFragment('test', fragment);
            expect(store.resolve(query)).to.have.same.members([fragment]);
        });
    
        it('resolve nested dependencies', () => {
            const query = '{ something { ...level1_a ...level1_b ...level1_c } }';
            const fragments = {
                level1_a: 'fragment level1_a on foo { ...level2_a }',
                level1_b: 'fragment level1_b on foo { ...level2_a ...level2_b }',
                level1_c: 'fragment level1_c on foo { ...level3_a }',
                level2_a: 'fragment level2_a on foo { ...level3_a }',
                level2_b: 'fragment level2_b on foo { bar }',
                level3_a: 'fragment level3_a on foo { test }',
            };
            const store = new dynql.FragmentStore();
            Object.entries(fragments).forEach(([name, fragment]) => {
                store.registerFragment(name, fragment);
            });
            expect(store.resolve(query)).to.have.same.members(Object.values(fragments));
        });
    
        it('resolve only required dependencies', () => {
            const query = '{ something { ...level1_c } }';
            const requiredFragments = {
                level1_c: 'fragment level1_c on foo { ...level3_a }',
                level3_a: 'fragment level3_a on foo { test }',
            };
            const fragments = {
                ...requiredFragments,
                level1_a: 'fragment level1_a on foo { ...level2_a }',
                level1_b: 'fragment level1_b on foo { ...level2_a ...level2_b }',
                level2_a: 'fragment level2_a on foo { ...level3_a }',
                level2_b: 'fragment level2_b on foo { bar }',
            };
            const store = new dynql.FragmentStore();
            Object.entries(fragments).forEach(([name, fragment]) => {
                store.registerFragment(name, fragment);
            });
            expect(store.resolve(query)).to.have.same.members(Object.values(requiredFragments));
        });

        it('resolve a fragment only once', () => {
            const query = '{ something { ...level1_c } }';
            const requiredFragments = {
                level1_c: 'fragment level1_c on foo { ...level3_a ...level1_d ...1nv4lid }',
                level1_d: 'fragment level1_c on foo { ...level1_d ...level3_a }',
                level3_a: 'fragment level3_a on foo { test }',
            };
            const fragments = {
                ...requiredFragments,
                level1_a: 'fragment level1_a on foo { ...level2_a }',
                level1_b: 'fragment level1_b on foo { ...level2_a ...level2_b }',
                level2_a: 'fragment level2_a on foo { ...level3_a }',
                level2_b: 'fragment level2_b on foo { bar }',
            };
            const store = new dynql.FragmentStore();
            Object.entries(fragments).forEach(([name, fragment]) => {
                store.registerFragment(name, fragment);
            });
            expect(store.resolve(query)).to.have.same.members(Object.values(requiredFragments));
        });
    
        it('resolve not yet defined dependencies', () => {
            const query = '{ something { ...level1_a ...level1_b ...level1_c } } fragment level1_a on bla { test }';
            const requiredFragments = {
                level1_b: 'fragment level1_b on foo { ...level2_b }',
                level1_c: 'fragment level1_c on foo { ...level3_a }',
                level2_b: 'fragment level2_b on foo { bar }',
                level3_a: 'fragment level3_a on foo { test }',
            };
            const fragments = {
                ...requiredFragments,
                level1_a: 'fragment level1_a on foo { ...level2_a }',
                level2_a: 'fragment level2_a on foo { ...level3_a }',
            };
            const store = new dynql.FragmentStore();
            Object.entries(fragments).forEach(([name, fragment]) => {
                store.registerFragment(name, fragment);
            });
            expect(store.resolve(query)).to.have.same.members(Object.values(requiredFragments));
        });
    
        it('throw an error when it can\'t resole a required fragment', () => {
            const store = new dynql.FragmentStore();
            expect(() => {
                store.resolve('{ something { ...foo } }');
            }).to.throw('Could not resolve required fragment foo!');
        })
    });
});

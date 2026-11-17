/**
 * Regression hashes of generated puzzles: for each (variant, level) combination the hash
 * of the puzzle that the pipeline gives for each of the 20 fixed seeds (see perf-helper.js).
 * GENERATED FILE - never edit by hand. Record the hashes of the current code on purpose
 * with
 *   node tests/perf.js --update-hashes
 * or SG_UPDATE_HASHES=1 node tests/node-runner.js --suite=perf
 * after a change that is meant to alter puzzles (a calibration, a new dig rule). A change
 * that must not alter them (an optimisation) leaves this file as it is: the suite "perf"
 * fails when a puzzle of a recorded (configuration, seed) pair differs.
 */
(function () {
  'use strict';

  var root = typeof self !== 'undefined' ? self : globalThis;
  var SG = root.SG = root.SG || {};
  SG.fixtures = SG.fixtures || {};

  SG.fixtures.regression = {
    version: 1,
    seeds: [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765, 10946],
    hashes: {
      'classic4/veryEasy': [
        'cfdf9052c826174e', '9c3830fae77b7fd6', '2d49259e3a97eb32', '546c1e997d9013fd',
        '728d910ad8a2c5c6', 'c8618eed83a0a299', '45e2eaf28bf1baae', 'e6b3415263cbafae',
        '334950b2bffd26ee', '87a5148ab00695e6', '27a541caf42a4846', '541f4a3aeaca8fb6',
        '0886c31a7d5c32d6', '3d654fba7c09d156', '810fb11be09d9ea7', 'b20f46f891a4305c',
        '903e95a48a750150', '482d8a5604ac756a', 'baa0db32101bb14e', 'e7b213f6e0eb4f0a'
      ],
      'classic6/veryEasy': [
        '2b6c9237e264b873', '6cc0e600ecf21184', 'd13f73833c4da377', 'cc057218e9ffb4dc',
        '9f5cb7793a7ff7a5', '789beba1f0dfde4d', 'e158c5100f8688d4', 'db1f065336f228c7',
        '3faec6a84cc6fd2c', '59ac945d0fff1ea1', 'e246c10eabe168c2', 'eab9642a661ecf06',
        '7c7655a4f6f334f0', '97e5b11758f02eb3', 'ea56fe0e290cc0a2', '6839c951ed87ee3d',
        'c9b16100419f04a4', 'b6d3f29fc6bb16fb', '7c640031339f6fbd', '5184466bdf0eb93f'
      ],
      'classic6/hard': [
        '0be384c7147fa983', 'ebf80364c8038d30', 'deebe99ca53c1b08', '16699f94c0182fc0',
        'f04dcdb2a7033d2e', '0417bf9be8da844f', '3934a44d0a2ebb31', '365b85297cef7075',
        '41782667eea6f043', '704b503d56ad1e41', 'b8f358daf51c2836', '33ef8b3c6916a3a8',
        '1e1ea32b2c78521f', 'b80a9a434f75e457', '1f3b5c169454b6ca', '86176e23cf286857',
        '15e21332252d6f6e', '0be944fd5d3fe141', 'd7355e2086317a44', '082d399365587347'
      ],
      'classic9/veryEasy': [
        'b69ed95547eb4f09', '5fff9ba28713275e', '8c0e84aa5609f656', '54f5331c2b6491e0',
        'f48626d223c29afe', '0f9ba7a745f98063', 'd5e9b1f92f079e25', 'b09bcc6d7460b631',
        '2649061483eced78', '72865cb6c633457a', 'cceff5adb44f0021', 'c6aa405ccfee8280',
        'cbe34a75d8407079', '79aea134907ba578', '26d4792cee9c4670', 'cad2d96526214659',
        'd763b71e39a8e842', '34def9b0aad43b7c', '84a0fb3b1f761def', '0ddd320e8abd7072'
      ],
      'classic9/easy': [
        'f13dafc7eb9b47c3', 'c48cdb30a2a694ac', 'c1f0fd63fe3f73c7', '2c0b5c6c3a821bf0',
        '2f596729e6d3a325', 'fc0995d0d9374fec', 'bbacee62d5a81fce', 'bf89a2b6caf77e1a',
        '5fdcad385fc3ac04', 'a8ed11845212cc68', 'c8e2457ecd3602a2', 'c5a71fae38bc99d2',
        'b7802c520e72e3fe', 'c439920c7e01d2d0', '3865e7e9a3e498d5', '2c65f22aeb883086',
        '89b52757515f80a3', 'cdafa4e21cb63f1e', 'a6084cccb0ead5d0', '38c28c06ab4590ea'
      ],
      'classic9/normal': [
        '643c9fdcc775c3a0', 'e0d7048ab913bf86', 'eeef3f6077a69a4c', 'd33e53a7f63629a3',
        '5a7ac7a01edc6bec', '02274b8f8570a9db', 'ef28fdca396a4496', 'fec22b176a036943',
        '344f5121108da81d', '36d8675075c3c7fc', 'fc2a91bd85977a61', '76c1a22ec8217a02',
        '2179010bc7bb4d1f', 'e3d6a5dd7b803ac1', '2eece18b3a87671f', '62032a6281b0860e',
        '2c954e8784927b33', 'e1f6061474401c98', '1f9b7aa5ee1db7b9', 'a451447f751e433b'
      ],
      'classic9/hard': [
        '40fdd3618f9fe1cd', '1ad080e6bdf5df2a', '7a9837af6ccfc94b', 'dce72ce6a0b55cea',
        '9e25846c604913e0', '51a6803b75dd9b5f', '1d9d0db3abde4727', '27cde9ccff3d3350',
        'aed146eb93c91bcf', '1f4232ef888e411b', 'fb1e5811a4a5944d', '790437da17a235f6',
        'a15979089850b364', 'a53d88004b80cbbc', '8685946bc9f9a7cf', '7294b065e03e5c39',
        '9b72e4ea0444d336', '2fca9b4d0d2534f1', '25e8f2abf906d05f', 'b277386afa20f9b6'
      ],
      'classic9/expert': [
        'ae1ff214cc133948', '63335b832060f687', 'c9d05e1ca3693320', 'bd4993516e41b57d',
        'dbbfb715c1d1ee99', '5eebd5fa52f7bcd6', '5644f604055dd378', '6efce395604475b9',
        '2b6a04f781a72363', '2b24125181b5be0d', '8d70a6b459b91bc8', 'e834db009b444f2c',
        'd7c4eb94aa5c8c78', 'f25baa1de162d051', '44cd56a81d024b74', '89b4883b5e3d9eaf',
        '73ddf9b6eb5a8c3a', '18983241bdd625ed', 'd230944fcb0b146b', 'df8b639b69bd474f'
      ],
      'classic9/master': [
        '2cd3877fdddcd4bb', 'b2617ee032a4016c', '5390975283b0ddbe', 'c217cd662641592a',
        '9acc42c4df5edcf8', 'e80d3687d10dbce3', '6d8d36b696971cba', 'c4261f0e59b00482',
        '4164e7fe5f7fe0e2', 'bd90aef9dcfdd355', '14ef54835200c2a7', 'e335866a21c69496',
        '139b0c7d4e773d61', '71afbd6714c77a53', 'a1e70ea13ee80f3d', '542018d1aa5f645d',
        '6f7e2103146cb837', 'be23ed7644f34a2a', '5fe9990500fc7509', '0653c5d7dc8f5133'
      ],
      'classic9/nightmare': [
        'af8cc1903dae114c', 'b607c41a92e66e56', 'd23f88fe192fe8d2', 'f67df36b1786e6ef',
        'fe091a72bfcef38e', 'cf4094aa622bddb6', '235a80d67f5dc78a', '7a18532b7b9079ef',
        'bd6893f3ae7f6b17', '66aefec9259ec7d5', '3d6abd4b2619bf9f', 'dad4670a797b4826',
        'fc9704b7e5afa893', '5808eca53f2e9399', '6b3b299bd3abd8af', '9ca8b356c180f9da',
        '2d5076ab2613714f', 'ac42ef5c747325f0', '8e46c4a506ec5d09', '7e5d71552b14f449'
      ],
      'mega12/normal': [
        '97897abcb3ad1978', '880378cbd0717e4f', '8db24fe4df2928a0', 'f7a01ff67ea68312',
        '9e98557b55b73817', 'bceb966210506f66', '1fd8b15b09114577', '52525aed259d8531',
        '425d6f45533a1781', 'ff0930f2fb12ca3e', 'ecd8bfc5dcb94cf9', '6232cbc9ca4931bd',
        'e17baeb9ba36830d', '6712ad085f3d73dc', '460aa705440e6769', '2ac84aa1f2b544dd',
        'b690724544e18d81', 'f65c13467942dc0a', 'ff5b4405f61ad259', '02d858c78647c28b'
      ],
      'mega16/easy': [
        '1213daa9241eb755', 'f17b3972b5078be6', 'fc5b478d924ead49', '2c105509e5b5df75',
        'b09a26da9b2f3c86', 'f777c5251cc36899', '2e014f049dc3bd10', '315950aeb4966b72',
        'bb3eae48acfe4f1c', 'f785d1caa546c7b6', 'b06682987398d3ec', 'e7a325fc8f0e12a0',
        '09d458188f85d904', '8d61b25e0438a6da', 'cadf5bc2518e6b2e', '0a3e5a0a160996fe',
        '7815271420b2d6d0', '36a08aabc4a1278f', '3b6475c95eb7cda5', '9980015af8ba472e'
      ],
      'diagonalX/easy': [
        '9c8e49f05ea7285c', 'b3d6628e39c5c302', '825ad7840cbd1898', 'ed2fd97eda3a5b52',
        'ca3467193eb70335', '4fc5878d57bebaf1', '5062e511d91b361d', 'b8fa35efceb9ed4b',
        '3369c38bed0e84ef', 'afa27c106add2eac', 'a4a739ace99ed790', '5864997927d7ac75',
        '07436df731180c13', '13f62fa2978df49e', '3cb099b3595569d7', '18c13b85be101b29',
        '69ce6a82fd52539e', 'e9142c88dff360d4', 'd5f4aeb7c4373de3', '21d0e09cd4e738d0'
      ],
      'diagonalX/nightmare': [
        '2d50e89ca97f0310', '083c9fd649906d0a', 'fa416f96c949db5a', 'c8551a66f1a2a85a',
        '260adf0349b1b0d7', '2e65208de779e4e1', 'b582ed3d61b8f841', '428e5ba3fe5a73e7',
        '47fbe548faed3e94', '51ff0ce01d01701c', '550c3b498fdfcfc5', 'b9b6e97f78e5f17b',
        '25c3288490a539a8', 'd518194cfc529680', 'b31380ece23c62f0', '121e7e377ca919e3',
        '3f6e2d96879e677a', '03b74046b0af2c4a', '369fafcc41d65530', '2853448c74d3d390'
      ],
      'hyper/hard': [
        'beb9f19e5f68c822', '42067bc4514f7148', '16f0b5ba0fa996c6', '45d21808d3065904',
        '1dde4e9d56c968a1', '731324bc439c8ec0', '311f4cc60de8213a', 'cd5dda6adbb98516',
        'a939d5b90f818855', '4c0e5a9a9d05a2d6', 'f74c25726f17805e', '5c4451eab2778e46',
        '4a45752844a042b4', 'fb5bfcc81e101284', '2c09a432d0ecf77e', '4923753c6e3cc050',
        'c5828c56cc86043a', '7a89449a7dd91316', 'b5407a1771d50303', '5a740a58f4fea224'
      ],
      'jigsaw9/normal': [
        '229595a6594b523a', 'bfdd28db6b1108ef', '6e3f276349ae5557', '9b8fa6394851bca5',
        '81539fad9a231461', '5191bc2b20f4459f', '0c21b74b77706e2f', '379c679d77e25c21',
        '545e182b73ef3b1f', '8387fc84b42859c8', 'c3c1aaf3b1a0bf37', '455e1f77c8cdb9d3',
        '918bb9bf712d4c2b', 'f3f89aa7588760b3', 'd199cd3a37aae596', '72b1875ce209a3e0',
        '75897d415d35867d', 'fed3eb4be007b90f', '58758a2c4fce9f80', '02f85726a9844efa'
      ],
      'jigsaw9/master': [
        '7fdd14af9030981b', '6d21affb4d1576cf', 'f11e9c363638d72a', '16dfd4f95762fd45',
        '8ceb13357ce25ee9', '77b607b3986cca97', '693948643a17b428', '9b2eda41b7340c9d',
        'd12e8ca57ac36569', '2bdbe0f5336aa299', 'e55235bc5abec080', '603cc0b4c7d8cc88',
        '73c507594a734845', '83d2e1d5b828e299', 'c7570cd179262e6d', '925808ff4d1d3b3b',
        'abce69b204215f3e', '4dd4ae877ce2e7f3', '9285ffe9911e70a5', 'bb018b9dfc069f01'
      ],
      'killer/easy': [
        'da1eebf5af0b0cb9', 'e02d325e6f5a2f02', '8e5621f702060fcb', 'a4fd2fa9ebcce985',
        '18196497692a7ba3', 'be9f0de6e071df4a', '8bca1b8647f11342', 'eaab31fd8f0c0721',
        'a37b93d7d6c55b33', '6a06cf7f42b0a3e3', 'c1e8ff4820d8f22c', 'faa7538f4026331b',
        '27f7248d703ea899', '7f9b9fc00f290284', '4430084f3ea5e7b3', 'cda500b8c27e15c4',
        '417d5494b4dbbcb0', 'f0f6ed371611452b', 'f6e936b8b44c019c', '49b1d4fc260b3810'
      ],
      'killer/hard': [
        '3ebeef31b34a35cd', '6ba5d6665fa90f42', 'c48225dfed2eccdb', 'f29839e4029eb9c8',
        '45e0878d343f0811', '25197193440b59df', '910dd7a96f77fe35', '79aeeefba7f3d077',
        '6bdea7abf96ae5f7', '6acbbdd97936928d', '3f4c9bcd90045409', '8125d02969965045',
        'aba201f7e7b2ffcb', '9fab0bacd7a2fee8', '0e4c9ada552b858e', 'e4a84af6314fd34a',
        'bfefdca26b175dd6', '30fde1e1bc69becd', '744737bca394c788', '47d25178effcb3a4'
      ],
      'greaterThan/normal': [
        '451f70324dc8cfde', '6178ebe3355d8de7', 'fdf616f1a201e4c5', 'bb4f2fb157042f5d',
        'd868bdfcb80befd0', 'e630c501243b17fd', 'e78928dd159a09b9', '1da2078420403d18',
        'acd99944b1398b68', '9d2dfcc72897d34b', 'abdc4f8d5d4d49b1', '505b2a4e5b1e9a72',
        'cf2cd98ae04a6066', '28c2ea302da80774', '474ecaf811fb58e4', '3687cb45ac207381',
        '30ebd95ebcc28622', '6b17f75973826cf5', '5dddb768e0d111d4', 'f4ec96f5f0d71eb1'
      ],
      'greaterThan/hard': [
        '57723d97f39afc43', 'bd35f3a2985656c6', 'ee05692893689fb4', 'c91392dadbe50c26',
        'fbca2786f61942ea', '472a41ba1d224cde', '4ad82e818f1fa83d', '770231461556c5ba',
        '3268fd0e36b4a7e2', '7ff7ff078c0d13e3', '5a5d8c2137663775', 'bb422294eda15ca0',
        '3ac95b0e79510d7a', '95cdcc2a01566a6e', '3babc68d92b12049', 'd181e4d8e6554e74',
        '0b2801e974fd1ecd', '95d2e231ac881b7d', '65e942133ab57edf', '6881a320008551fc'
      ],
      'samurai/easy': [
        'f96c08e07851e634', '29ea510982b8b605', 'e24a3783fba0d16f', 'a6601c579efce54b',
        '7d34145019b7ac24', '1c56198290a5dc1e', '6884c5e08ca17884', '3d4bf69d87e8da41',
        '523df76d67685d01', 'b0c0d49b868f03c7', 'ebf2becb52c91c17', 'b13e2b24692b1260',
        '6474c0651399c159', '54dd5532a2eb258e', '36644920ccde7f24', 'f476d1e95733e335',
        '957046eee4d64972', '3dbccc48460dd0ec', 'f4a6bcf48c804820', 'ec0517d97ac2dbb5'
      ],
      'sohei/veryEasy': [
        'a0b73b38900c816c', '1f9632340b3289b0', '2d1421dfc3fd477b', 'b232e83338e13cc7',
        '6bb27729406ed46d', 'ef0dd7cdf30c2179', '02ef82980a0d56fc', '95cdfe67491a0fd3',
        '85e79e4572f1a3f1', 'f7b23bd86c4e0a8c', '19434e6df9b68c69', 'c62bda95e241daf1',
        '07550a1e621f5682', 'df82d5a102579495', '8f489f862f61874a', '3b1caccba1d276df',
        'b83d163c35a2db28', '60f3a0f33b123ad7', '4dbb4d036c950357', 'c3ef4a82a5063d7e'
      ],
      'butterfly/normal': [
        'd90cdd3552337f59', '7a94e011a87fdc5d', 'a968f74fca20834b', '69efd16ff1dd2d8b',
        '906a5592a83a0d36', 'b45089011ed8de0d', '3ba9f2026059a496', '3c2344ed83a6fb51',
        '5952f46a00628fde', 'a91195c46f34c300', '6d3d197dddd10e11', '6abd8b19b72a3e35',
        '5b5c80220693f996', '4cb84b28fd608b3c', '06fd8974a3e39bb0', '1bf06aee594aaaca',
        '81465f298bc85355', '2726b974691b9950', '09bc863295882686', '30c22595f31fc269'
      ],
      'flower/normal': [
        '29a1ca2796eb3c73', '71f71e28281a0bbc', '0a7de5eb063a148f', 'a2184c82f74fdb3e',
        '3d2c0b66ff7ae11a', 'a5c4ed87e8936ed3', '1ff85c5f07fbd8db', 'eb6fbf557bafcbc9',
        '383a5fe938e475a5', '90c3c8866706070a', '7177d52ac3569496', '50cccfec506e1678',
        '636b4127f4d6f523', 'e9cfaba77d3d95c3', '039353de203380e2', '21a8bd7c9608a558',
        '3820f5bd7b062201', '338b95d9e6741be5', '95d5de7fb560f24b', 'db8a67f2b521764e'
      ],
      'wordoku/normal': [
        '106d019f85ac4e3b', '84c18ad36aa77cf7', 'b759edc0722cbfe4', 'cdb6125093a657cc',
        '3749ae2311557287', 'e5e9ffb1f77da01d', '13c404cb2d2927c7', 'fece246665d97f82',
        'ae8755effe00e4ab', 'e8bd112ddf6387e1', 'c5bc5f5b181d99bf', '796cb18ce3db12e0',
        '53105a2fdb847f13', '9af316182f69aa0c', '0a64915ebe8dac5a', '48d651654af67b51',
        '9bd86cc4381884b0', '9acdf3ec4b782cb0', '9881e4742566e8b8', 'a779152d916fb241'
      ]
    }
  };
})();

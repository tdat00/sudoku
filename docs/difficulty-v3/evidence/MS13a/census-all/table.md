# MS13a census of the grouped graph builder on the 15 models of SG.testkit.VARIANT_IDS

Default limits 4,096 groups / 50,000 units; "lifted" = no limit (the true work). Work quantiles are min / median / p95 / max.
Populations: **constructed** = the blank state; **synthetic** = states of the test kit (seed 77003, 6 puzzles dug from random
solutions, 24 states: 6 initial, 6 propagated, 12 pruned) and 6 states with many wrong candidates (seed 8001); **ladder** = every
position at which a ladder solve of the 6 propagated states reaches the chain group (xyChain is tried because every earlier
technique found nothing) on those seeded puzzles. Killer and Greater-Than are the uncaged / uninequalitied models of the test kit.

## Structural maximum (blank state, constructed)

| Model | cells | digits | blank work | x 50,000 | additional groups | nodes | default result | checker work |
|---|---|---|---|---|---|---|---|---|
| classic4 | 16 | 4 | 2,144 | 0.04 | 64 | 128 | complete | 2,144 |
| classic6 | 36 | 6 | 13,590 | 0.27 | 180 | 396 | complete | 13,590 |
| classic9 | 81 | 9 | 84,807 | 1.70 | 486 | 1,215 | capped (work) | 84,807 |
| mega12 | 144 | 12 | 321,048 | 6.42 | 1,008 | 2,736 | capped (work) | 321,048 |
| mega16 | 256 | 16 | 1,209,344 | 24.19 | 2,048 | 6,144 | capped (work) | 1,209,344 |
| diagonalX | 81 | 9 | 84,807 | 1.70 | 486 | 1,215 | capped (work) | 84,807 |
| hyper | 81 | 9 | 84,807 | 1.70 | 486 | 1,215 | capped (work) | 84,807 |
| jigsaw9 | 81 | 9 | 78,822 | 1.58 | 441 | 1,170 | capped (work) | 78,822 |
| killer | 81 | 9 | 84,807 | 1.70 | 486 | 1,215 | capped (work) | 84,807 |
| greaterThan | 81 | 9 | 84,807 | 1.70 | 486 | 1,215 | capped (work) | 84,807 |
| samurai | 369 | 9 | 1,715,391 | 34.31 | 2,214 | 5,535 | capped (work) | 1,715,391 |
| sohei | 288 | 9 | 1,047,384 | 20.95 | 1,728 | 4,320 | capped (work) | 1,047,384 |
| butterfly | 144 | 9 | 268,704 | 5.37 | 864 | 2,160 | capped (work) | 268,704 |
| flower | 189 | 9 | 459,297 | 9.19 | 1,134 | 2,835 | capped (work) | 459,297 |
| wordoku | 81 | 9 | 84,807 | 1.70 | 486 | 1,215 | capped (work) | 84,807 |

## Ladder positions at the chain group (seeded puzzles)

| Model | puzzles reaching the chain group | positions | complete at default | capped (work / nodes) | over 50,000 | default work | lifted work |
|---|---|---|---|---|---|---|---|
| classic4 | 0 of 6 | 0 | - | - | - | - | - |
| classic6 | 0 of 6 | 0 | - | - | - | - | - |
| classic9 | 1 of 6 | 5 | 5 | 0 / 0 | 0 | 4,581 / 4,942 / 6,117 / 6,117 | 4,581 / 4,942 / 6,117 / 6,117 |
| mega12 | 3 of 6 | 32 | 32 | 0 / 0 | 0 | 1,401 / 6,971 / 13,216 / 13,644 | 1,401 / 6,971 / 13,216 / 13,644 |
| mega16 | 6 of 6 | 321 | 301 | 20 / 0 | 20 | 581 / 23,349 / 50,000 / 50,000 | 581 / 23,349 / 50,505 / 57,089 |
| diagonalX | 3 of 6 | 84 | 84 | 0 / 0 | 0 | 2,633 / 9,002 / 14,757 / 16,419 | 2,633 / 9,002 / 14,757 / 16,419 |
| hyper | 3 of 6 | 67 | 67 | 0 / 0 | 0 | 2,504 / 10,566 / 14,825 / 15,387 | 2,504 / 10,566 / 14,825 / 15,387 |
| jigsaw9 | 2 of 6 | 26 | 26 | 0 / 0 | 0 | 3,289 / 5,798 / 7,795 / 8,693 | 3,289 / 5,798 / 7,795 / 8,693 |
| killer | 1 of 6 | 5 | 5 | 0 / 0 | 0 | 4,581 / 4,942 / 6,117 / 6,117 | 4,581 / 4,942 / 6,117 / 6,117 |
| greaterThan | 1 of 6 | 5 | 5 | 0 / 0 | 0 | 4,581 / 4,942 / 6,117 / 6,117 | 4,581 / 4,942 / 6,117 / 6,117 |
| samurai | 4 of 6 | 48 | 10 | 38 / 0 | 38 | 430 / 50,000 / 50,000 / 50,000 | 430 / 85,352 / 137,186 / 138,529 |
| sohei | 1 of 6 | 51 | 8 | 43 / 0 | 43 | 11,922 / 50,000 / 50,000 / 50,000 | 11,922 / 109,951 / 121,564 / 124,066 |
| butterfly | 3 of 6 | 15 | 15 | 0 / 0 | 0 | 10,495 / 26,658 / 31,008 / 31,008 | 10,495 / 26,658 / 31,008 / 31,008 |
| flower | 3 of 6 | 44 | 27 | 17 / 0 | 17 | 8,428 / 44,057 / 50,000 / 50,000 | 8,428 / 44,057 / 70,028 / 70,583 |
| wordoku | 0 of 6 | 0 | - | - | - | - | - |

## Synthetic states (30 per model: initial, propagated, pruned and many wrong candidates), summary

| Model | calls | complete at default | capped (work / nodes) | lifted work median / p95 / max |
|---|---|---|---|---|
| classic4 | 30 | 30 | 0 / 0 | population medians 0 to 185; p95s up to 295; max 295 |
| classic6 | 30 | 30 | 0 / 0 | population medians 200 to 1,594; p95s up to 1,708; max 1,708 |
| classic9 | 30 | 30 | 0 / 0 | population medians 3,126 to 7,669; p95s up to 9,712; max 9,712 |
| mega12 | 30 | 30 | 0 / 0 | population medians 7,724 to 21,996; p95s up to 29,833; max 29,833 |
| mega16 | 30 | 22 | 8 / 0 | population medians 26,504 to 68,021; p95s up to 72,092; max 72,092 |
| diagonalX | 30 | 30 | 0 / 0 | population medians 2,868 to 15,196; p95s up to 18,494; max 18,494 |
| hyper | 30 | 30 | 0 / 0 | population medians 2,791 to 17,041; p95s up to 23,138; max 23,138 |
| jigsaw9 | 30 | 30 | 0 / 0 | population medians 2,400 to 17,644; p95s up to 21,142; max 21,142 |
| killer | 30 | 30 | 0 / 0 | population medians 3,126 to 7,669; p95s up to 9,712; max 9,712 |
| greaterThan | 30 | 30 | 0 / 0 | population medians 3,126 to 7,669; p95s up to 9,712; max 9,712 |
| samurai | 30 | 16 | 14 / 0 | population medians 7,430 to 257,193; p95s up to 263,265; max 263,265 |
| sohei | 30 | 16 | 14 / 0 | population medians 29,134 to 172,883; p95s up to 190,178; max 190,178 |
| butterfly | 30 | 24 | 6 / 0 | population medians 3,325 to 69,945; p95s up to 74,010; max 74,010 |
| flower | 30 | 20 | 10 / 0 | population medians 4,834 to 127,023; p95s up to 140,148; max 140,148 |
| wordoku | 30 | 30 | 0 / 0 | population medians 871 to 7,325; p95s up to 10,695; max 10,695 |

## Synthetic states by kind and constructed blank

| Model | population | calls | complete at default | capped (work / nodes) | over 50,000 | default work | lifted work | mean ms lifted |
|---|---|---|---|---|---|---|---|---|
| classic4 | constructed: blank | 1 | 1 | 0 / 0 | 0 | 2,144 / 2,144 / 2,144 / 2,144 | 2,144 / 2,144 / 2,144 / 2,144 | 0.559 |
| classic4 | synthetic: initial | 6 | 6 | 0 / 0 | 0 | 52 / 185 / 295 / 295 | 52 / 185 / 295 / 295 | 0.212 |
| classic4 | synthetic: propagated | 6 | 6 | 0 / 0 | 0 | 0 / 0 / 0 / 0 | 0 / 0 / 0 / 0 | 0.01 |
| classic4 | synthetic: pruned | 12 | 12 | 0 / 0 | 0 | 0 / 0 / 0 / 0 | 0 / 0 / 0 / 0 | 0.008 |
| classic4 | synthetic: many wrong candidates | 6 | 6 | 0 / 0 | 0 | 38 / 119 / 151 / 151 | 38 / 119 / 151 / 151 | 0.047 |
| classic6 | constructed: blank | 1 | 1 | 0 / 0 | 0 | 13,590 / 13,590 / 13,590 / 13,590 | 13,590 / 13,590 / 13,590 / 13,590 | 1.6 |
| classic6 | synthetic: initial | 6 | 6 | 0 / 0 | 0 | 509 / 1,594 / 1,708 / 1,708 | 509 / 1,594 / 1,708 / 1,708 | 0.11 |
| classic6 | synthetic: propagated | 6 | 6 | 0 / 0 | 0 | 0 / 269 / 1,164 / 1,164 | 0 / 269 / 1,164 / 1,164 | 0.044 |
| classic6 | synthetic: pruned | 12 | 12 | 0 / 0 | 0 | 0 / 200 / 1,012 / 1,012 | 0 / 200 / 1,012 / 1,012 | 0.038 |
| classic6 | synthetic: many wrong candidates | 6 | 6 | 0 / 0 | 0 | 344 / 594 / 830 / 830 | 344 / 594 / 830 / 830 | 0.076 |
| classic9 | constructed: blank | 1 | 0 | 1 / 0 | 1 | 50,000 / 50,000 / 50,000 / 50,000 | 84,807 / 84,807 / 84,807 / 84,807 | 4.542 |
| classic9 | synthetic: initial | 6 | 6 | 0 / 0 | 0 | 2,651 / 7,669 / 9,712 / 9,712 | 2,651 / 7,669 / 9,712 / 9,712 | 0.453 |
| classic9 | synthetic: propagated | 6 | 6 | 0 / 0 | 0 | 0 / 4,891 / 7,176 / 7,176 | 0 / 4,891 / 7,176 / 7,176 | 0.328 |
| classic9 | synthetic: pruned | 12 | 12 | 0 / 0 | 0 | 0 / 3,574 / 6,812 / 6,812 | 0 / 3,574 / 6,812 / 6,812 | 0.156 |
| classic9 | synthetic: many wrong candidates | 6 | 6 | 0 / 0 | 0 | 1,099 / 3,126 / 4,572 / 4,572 | 1,099 / 3,126 / 4,572 / 4,572 | 0.237 |
| mega12 | constructed: blank | 1 | 0 | 1 / 0 | 1 | 50,000 / 50,000 / 50,000 / 50,000 | 321,048 / 321,048 / 321,048 / 321,048 | 15.091 |
| mega12 | synthetic: initial | 6 | 6 | 0 / 0 | 0 | 12,250 / 21,996 / 29,833 / 29,833 | 12,250 / 21,996 / 29,833 / 29,833 | 1.619 |
| mega12 | synthetic: propagated | 6 | 6 | 0 / 0 | 0 | 0 / 10,981 / 17,137 / 17,137 | 0 / 10,981 / 17,137 / 17,137 | 0.58 |
| mega12 | synthetic: pruned | 12 | 12 | 0 / 0 | 0 | 0 / 7,952 / 14,734 / 14,734 | 0 / 7,952 / 14,734 / 14,734 | 0.353 |
| mega12 | synthetic: many wrong candidates | 6 | 6 | 0 / 0 | 0 | 3,428 / 7,724 / 15,117 / 15,117 | 3,428 / 7,724 / 15,117 / 15,117 | 1.144 |
| mega16 | constructed: blank | 1 | 0 | 1 / 0 | 1 | 50,000 / 50,000 / 50,000 / 50,000 | 1,209,344 / 1,209,344 / 1,209,344 / 1,209,344 | 32.685 |
| mega16 | synthetic: initial | 6 | 1 | 5 / 0 | 5 | 39,833 / 50,000 / 50,000 / 50,000 | 39,833 / 68,021 / 72,092 / 72,092 | 3.045 |
| mega16 | synthetic: propagated | 6 | 4 | 2 / 0 | 2 | 11,069 / 47,544 / 50,000 / 50,000 | 11,069 / 47,544 / 58,700 / 58,700 | 2.25 |
| mega16 | synthetic: pruned | 12 | 12 | 0 / 0 | 0 | 7,046 / 26,504 / 48,880 / 48,880 | 7,046 / 26,504 / 48,880 / 48,880 | 1.442 |
| mega16 | synthetic: many wrong candidates | 6 | 5 | 1 / 0 | 1 | 13,713 / 27,301 / 50,000 / 50,000 | 13,713 / 27,301 / 58,921 / 58,921 | 2.747 |
| diagonalX | constructed: blank | 1 | 0 | 1 / 0 | 1 | 50,000 / 50,000 / 50,000 / 50,000 | 84,807 / 84,807 / 84,807 / 84,807 | 3.782 |
| diagonalX | synthetic: initial | 6 | 6 | 0 / 0 | 0 | 2,722 / 15,196 / 18,494 / 18,494 | 2,722 / 15,196 / 18,494 / 18,494 | 0.675 |
| diagonalX | synthetic: propagated | 6 | 6 | 0 / 0 | 0 | 0 / 12,516 / 16,573 / 16,573 | 0 / 12,516 / 16,573 / 16,573 | 0.401 |
| diagonalX | synthetic: pruned | 12 | 12 | 0 / 0 | 0 | 0 / 4,304 / 12,579 / 12,579 | 0 / 4,304 / 12,579 / 12,579 | 0.266 |
| diagonalX | synthetic: many wrong candidates | 6 | 6 | 0 / 0 | 0 | 1,279 / 2,868 / 4,291 / 4,291 | 1,279 / 2,868 / 4,291 / 4,291 | 0.255 |
| hyper | constructed: blank | 1 | 0 | 1 / 0 | 1 | 50,000 / 50,000 / 50,000 / 50,000 | 84,807 / 84,807 / 84,807 / 84,807 | 4.047 |
| hyper | synthetic: initial | 6 | 6 | 0 / 0 | 0 | 2,119 / 17,041 / 23,138 / 23,138 | 2,119 / 17,041 / 23,138 / 23,138 | 0.646 |
| hyper | synthetic: propagated | 6 | 6 | 0 / 0 | 0 | 0 / 14,806 / 18,925 / 18,925 | 0 / 14,806 / 18,925 / 18,925 | 0.449 |
| hyper | synthetic: pruned | 12 | 12 | 0 / 0 | 0 | 0 / 5,566 / 14,944 / 14,944 | 0 / 5,566 / 14,944 / 14,944 | 0.322 |
| hyper | synthetic: many wrong candidates | 6 | 6 | 0 / 0 | 0 | 1,267 / 2,791 / 3,679 / 3,679 | 1,267 / 2,791 / 3,679 / 3,679 | 0.166 |
| jigsaw9 | constructed: blank | 1 | 0 | 1 / 0 | 1 | 50,000 / 50,000 / 50,000 / 50,000 | 78,822 / 78,822 / 78,822 / 78,822 | 3.096 |
| jigsaw9 | synthetic: initial | 6 | 6 | 0 / 0 | 0 | 3,383 / 17,644 / 21,142 / 21,142 | 3,383 / 17,644 / 21,142 / 21,142 | 0.609 |
| jigsaw9 | synthetic: propagated | 6 | 6 | 0 / 0 | 0 | 0 / 14,633 / 19,027 / 19,027 | 0 / 14,633 / 19,027 / 19,027 | 0.412 |
| jigsaw9 | synthetic: pruned | 12 | 12 | 0 / 0 | 0 | 0 / 6,899 / 17,568 / 17,568 | 0 / 6,899 / 17,568 / 17,568 | 0.322 |
| jigsaw9 | synthetic: many wrong candidates | 6 | 6 | 0 / 0 | 0 | 1,045 / 2,400 / 3,897 / 3,897 | 1,045 / 2,400 / 3,897 / 3,897 | 0.139 |
| killer | constructed: blank | 1 | 0 | 1 / 0 | 1 | 50,000 / 50,000 / 50,000 / 50,000 | 84,807 / 84,807 / 84,807 / 84,807 | 3.154 |
| killer | synthetic: initial | 6 | 6 | 0 / 0 | 0 | 2,651 / 7,669 / 9,712 / 9,712 | 2,651 / 7,669 / 9,712 / 9,712 | 0.501 |
| killer | synthetic: propagated | 6 | 6 | 0 / 0 | 0 | 0 / 4,891 / 7,176 / 7,176 | 0 / 4,891 / 7,176 / 7,176 | 0.176 |
| killer | synthetic: pruned | 12 | 12 | 0 / 0 | 0 | 0 / 3,574 / 6,812 / 6,812 | 0 / 3,574 / 6,812 / 6,812 | 0.137 |
| killer | synthetic: many wrong candidates | 6 | 6 | 0 / 0 | 0 | 1,099 / 3,126 / 4,572 / 4,572 | 1,099 / 3,126 / 4,572 / 4,572 | 0.152 |
| greaterThan | constructed: blank | 1 | 0 | 1 / 0 | 1 | 50,000 / 50,000 / 50,000 / 50,000 | 84,807 / 84,807 / 84,807 / 84,807 | 3.273 |
| greaterThan | synthetic: initial | 6 | 6 | 0 / 0 | 0 | 2,651 / 7,669 / 9,712 / 9,712 | 2,651 / 7,669 / 9,712 / 9,712 | 0.513 |
| greaterThan | synthetic: propagated | 6 | 6 | 0 / 0 | 0 | 0 / 4,891 / 7,176 / 7,176 | 0 / 4,891 / 7,176 / 7,176 | 0.194 |
| greaterThan | synthetic: pruned | 12 | 12 | 0 / 0 | 0 | 0 / 3,574 / 6,812 / 6,812 | 0 / 3,574 / 6,812 / 6,812 | 0.136 |
| greaterThan | synthetic: many wrong candidates | 6 | 6 | 0 / 0 | 0 | 1,099 / 3,126 / 4,572 / 4,572 | 1,099 / 3,126 / 4,572 / 4,572 | 0.145 |
| samurai | constructed: blank | 1 | 0 | 1 / 0 | 1 | 50,000 / 50,000 / 50,000 / 50,000 | 1,715,391 / 1,715,391 / 1,715,391 / 1,715,391 | 37.75 |
| samurai | synthetic: initial | 6 | 0 | 6 / 0 | 6 | 50,000 / 50,000 / 50,000 / 50,000 | 61,826 / 257,193 / 263,265 / 263,265 | 5.2 |
| samurai | synthetic: propagated | 6 | 3 | 3 / 0 | 3 | 535 / 50,000 / 50,000 / 50,000 | 535 / 56,513 / 173,347 / 173,347 | 4.563 |
| samurai | synthetic: pruned | 12 | 8 | 4 / 0 | 4 | 333 / 7,430 / 50,000 / 50,000 | 333 / 7,430 / 140,116 / 140,116 | 1.223 |
| samurai | synthetic: many wrong candidates | 6 | 5 | 1 / 0 | 1 | 20,954 / 44,504 / 50,000 / 50,000 | 20,954 / 44,504 / 76,851 / 76,851 | 0.929 |
| sohei | constructed: blank | 1 | 0 | 1 / 0 | 1 | 50,000 / 50,000 / 50,000 / 50,000 | 1,047,384 / 1,047,384 / 1,047,384 / 1,047,384 | 18.488 |
| sohei | synthetic: initial | 6 | 2 | 4 / 0 | 4 | 34,180 / 50,000 / 50,000 / 50,000 | 34,180 / 172,883 / 190,178 / 190,178 | 2.812 |
| sohei | synthetic: propagated | 6 | 3 | 3 / 0 | 3 | 0 / 50,000 / 50,000 / 50,000 | 0 / 124,267 / 156,345 / 156,345 | 2.116 |
| sohei | synthetic: pruned | 12 | 6 | 6 / 0 | 6 | 0 / 50,000 / 50,000 / 50,000 | 0 / 97,416 / 137,775 / 137,775 | 1.563 |
| sohei | synthetic: many wrong candidates | 6 | 5 | 1 / 0 | 1 | 13,676 / 29,134 / 50,000 / 50,000 | 13,676 / 29,134 / 51,232 / 51,232 | 0.938 |
| butterfly | constructed: blank | 1 | 0 | 1 / 0 | 1 | 50,000 / 50,000 / 50,000 / 50,000 | 268,704 / 268,704 / 268,704 / 268,704 | 8.794 |
| butterfly | synthetic: initial | 6 | 3 | 3 / 0 | 3 | 9,468 / 50,000 / 50,000 / 50,000 | 9,468 / 69,945 / 74,010 / 74,010 | 1.895 |
| butterfly | synthetic: propagated | 6 | 3 | 3 / 0 | 3 | 0 / 50,000 / 50,000 / 50,000 | 0 / 50,275 / 60,553 / 60,553 | 1.266 |
| butterfly | synthetic: pruned | 12 | 12 | 0 / 0 | 0 | 0 / 3,325 / 44,204 / 44,204 | 0 / 3,325 / 44,204 / 44,204 | 0.948 |
| butterfly | synthetic: many wrong candidates | 6 | 6 | 0 / 0 | 0 | 3,126 / 7,046 / 10,770 / 10,770 | 3,126 / 7,046 / 10,770 / 10,770 | 0.395 |
| flower | constructed: blank | 1 | 0 | 1 / 0 | 1 | 50,000 / 50,000 / 50,000 / 50,000 | 459,297 / 459,297 / 459,297 / 459,297 | 13.274 |
| flower | synthetic: initial | 6 | 3 | 3 / 0 | 3 | 12,887 / 50,000 / 50,000 / 50,000 | 12,887 / 127,023 / 140,148 / 140,148 | 3.518 |
| flower | synthetic: propagated | 6 | 3 | 3 / 0 | 3 | 0 / 50,000 / 50,000 / 50,000 | 0 / 97,197 / 119,359 / 119,359 | 2.181 |
| flower | synthetic: pruned | 12 | 8 | 4 / 0 | 4 | 0 / 4,834 / 50,000 / 50,000 | 0 / 4,834 / 88,912 / 88,912 | 1.503 |
| flower | synthetic: many wrong candidates | 6 | 6 | 0 / 0 | 0 | 5,148 / 11,663 / 21,438 / 21,438 | 5,148 / 11,663 / 21,438 / 21,438 | 0.603 |
| wordoku | constructed: blank | 1 | 0 | 1 / 0 | 1 | 50,000 / 50,000 / 50,000 / 50,000 | 84,807 / 84,807 / 84,807 / 84,807 | 3.712 |
| wordoku | synthetic: initial | 6 | 6 | 0 / 0 | 0 | 3,241 / 7,325 / 10,695 / 10,695 | 3,241 / 7,325 / 10,695 / 10,695 | 0.373 |
| wordoku | synthetic: propagated | 6 | 6 | 0 / 0 | 0 | 0 / 1,111 / 2,774 / 2,774 | 0 / 1,111 / 2,774 / 2,774 | 0.061 |
| wordoku | synthetic: pruned | 12 | 12 | 0 / 0 | 0 | 0 / 871 / 2,174 / 2,174 | 0 / 871 / 2,174 / 2,174 | 0.052 |
| wordoku | synthetic: many wrong candidates | 6 | 6 | 0 / 0 | 0 | 972 / 3,076 / 4,317 / 4,317 | 972 / 3,076 / 4,317 / 4,317 | 0.143 |

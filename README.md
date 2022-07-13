# gen-52

Yet another variation of masked blur effect.
                                            
Based on gen-51 with a few changes. Removed the original blurmap distort for a simple random pixel dispersion.
Added an intermediary pass that distorts the base image with simplex based curl noise.
The masking is done on two different blur levels for this one, one minimal blur to remove curl noise distortion artifacts
and a fuzzier blur.
             
The internal resolution is doubled before scaling it down, which makes it a lot slower than gen-51, but produces crisper
edges for the minimal blur.

[Live Version](http://fforw.de/static/demo/gen-52/)

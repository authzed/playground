## Proto Files
This is vendored proto from the SpiceDB repo. There isn't currently a good way to get `buf generate` to use the SpiceDB internal proto that doesn't involve pushing it to the buf proto registry, which we don't want to do right now. Vendoring allows us to reference it in `buf.gen.yaml`.
